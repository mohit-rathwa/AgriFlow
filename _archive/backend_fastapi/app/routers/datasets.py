"""
Dataset management router — upload, list, detail, and delete.

Handles CSV file upload with quality checks, listing user datasets,
and cascading deletion of datasets with associated records.
"""

import os
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.models import Dataset, User
from app.schemas.dataset import DatasetRead, DatasetStatus
from app.services.dataset_service import process_upload

settings = get_settings()
router = APIRouter(prefix="/datasets", tags=["Datasets"])


@router.post(
    "/upload",
    response_model=DatasetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a CSV dataset",
)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetRead:
    """Upload a CSV file, run quality checks, and insert records into DB.

    The file is saved to the upload directory and its contents are parsed,
    validated, and inserted into the mandi_records table. A quality report
    is generated and stored in the dataset metadata.

    Args:
        file: Uploaded CSV file.
        name: Display name for the dataset.

    Returns:
        Full dataset record including quality report.

    Raises:
        HTTPException: 400 if the file is not a valid CSV.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are accepted",
        )

    # Read file bytes
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # Create dataset record in 'processing' state
    dataset = Dataset(
        user_id=current_user.id,
        name=name,
        status="processing",
    )
    db.add(dataset)
    await db.flush()

    # Save file to disk
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    storage_path = os.path.join(upload_dir, f"{dataset.id}.csv")

    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    # Process: parse, quality check, insert records
    try:
        await process_upload(db, dataset.id, file_bytes, storage_path)
    except Exception as e:
        # Dataset status is set to 'error' inside process_upload
        pass

    # Reload to get updated fields
    await db.refresh(dataset)

    return DatasetRead.model_validate(dataset)


@router.get(
    "/",
    response_model=List[DatasetStatus],
    summary="List all datasets for the current user",
)
async def list_datasets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DatasetStatus]:
    """Return all datasets belonging to the authenticated user.

    Results are ordered by creation date descending (newest first).
    """
    stmt = (
        select(Dataset)
        .where(Dataset.user_id == current_user.id)
        .order_by(Dataset.created_at.desc())
    )
    result = await db.execute(stmt)
    datasets = result.scalars().all()
    return [DatasetStatus.model_validate(d) for d in datasets]


@router.get(
    "/{dataset_id}",
    response_model=DatasetRead,
    summary="Get dataset details",
)
async def get_dataset(
    dataset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetRead:
    """Return full details for a single dataset.

    Raises:
        HTTPException: 404 if the dataset does not exist or does not
            belong to the current user.
    """
    stmt = select(Dataset).where(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    dataset = result.scalar_one_or_none()
    if dataset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )
    return DatasetRead.model_validate(dataset)


@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a dataset",
)
async def delete_dataset(
    dataset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a dataset and all associated records.

    Cascading deletes remove mandi records, analysis jobs, and
    bottleneck events linked to this dataset.
    """
    stmt = select(Dataset).where(
        Dataset.id == dataset_id,
        Dataset.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    dataset = result.scalar_one_or_none()
    if dataset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )
    await db.delete(dataset)
