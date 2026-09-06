import pandas as pd
import numpy as np
from xgboost import XGBRegressor
import shap
import joblib
import os

MODEL_PATH = 'trained_model.joblib'

def train_model(csv_path: str):
    """
    Train XGBoost on AGMARKNET data.
    Features: month, day_of_week, state (encoded), commodity (encoded), 
              lag_7 (modal price 7 days ago), lag_30 (modal price 30 days ago),
              rolling_mean_7 (7-day rolling avg)
    Target: modalPrice
    """
    # Read CSV
    df = pd.read_csv(csv_path)
    
    col_map = {
        'commodity': 'commodity',
        'Commodity': 'commodity',
        'COMMODITY': 'commodity',
        'modal_price': 'modalPrice',
        'Modal_Price': 'modalPrice',
        'MODAL_PRICE': 'modalPrice',
        'state_name': 'state',
        'State': 'state',
        'report_date': 'arrivalDate',
        'Arrival_Date': 'arrivalDate',
        'arrival_date': 'arrivalDate',
        'Date': 'arrivalDate',
        'district_name': 'district',
        'District': 'district',
        'market_center': 'mandiName',
        'Market': 'mandiName',
        'variety': 'variety',
        'Variety': 'variety'
    }
    df = df.rename(columns=col_map)
    
    # Parse dates
    df['arrivalDate'] = pd.to_datetime(df['arrivalDate'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['arrivalDate', 'modalPrice'])
    df['modalPrice'] = pd.to_numeric(df['modalPrice'], errors='coerce')
    df = df.dropna(subset=['modalPrice'])
    
    # Sort by date
    df = df.sort_values('arrivalDate')
    
    # Feature engineering
    df['month'] = df['arrivalDate'].dt.month
    df['day_of_week'] = df['arrivalDate'].dt.dayofweek
    df['day_of_year'] = df['arrivalDate'].dt.dayofyear
    
    # Encode categoricals
    from sklearn.preprocessing import LabelEncoder
    le_state = LabelEncoder()
    le_commodity = LabelEncoder()
    df['state_encoded'] = le_state.fit_transform(df['state'].astype(str))
    df['commodity_encoded'] = le_commodity.fit_transform(df['commodity'].astype(str))
    
    # Lag features (per commodity + state group)
    df['lag_7'] = df.groupby(['commodity', 'state'])['modalPrice'].shift(7)
    df['lag_30'] = df.groupby(['commodity', 'state'])['modalPrice'].shift(30)
    df['rolling_mean_7'] = df.groupby(['commodity', 'state'])['modalPrice'].transform(
        lambda x: x.rolling(window=7, min_periods=1).mean()
    )
    
    # Drop rows with NaN lag features
    df = df.dropna(subset=['lag_7', 'lag_30'])
    
    # Select features
    feature_cols = ['month', 'day_of_week', 'day_of_year', 'state_encoded', 
                    'commodity_encoded', 'lag_7', 'lag_30', 'rolling_mean_7']
    X = df[feature_cols]
    y = df['modalPrice']
    
    # Train/test split (last 20% for testing)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    # Train XGBoost
    model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    from sklearn.metrics import mean_absolute_error, r2_score
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Save model + encoders
    artifact = {
        'model': model,
        'le_state': le_state,
        'le_commodity': le_commodity,
        'feature_cols': feature_cols,
        'metrics': {'mae': float(mae), 'r2': float(r2)}
    }
    joblib.dump(artifact, MODEL_PATH)
    
    print(f'Model trained! MAE: {mae:.2f}, R2: {r2:.4f}')
    print(f'Saved to {MODEL_PATH}')
    return artifact


def load_model():
    """Load trained model from disk"""
    if not os.path.exists(MODEL_PATH):
        return None
    return joblib.load(MODEL_PATH)


def predict_price(artifact, commodity: str, state: str, month: int, day_of_week: int, 
                  day_of_year: int, lag_7: float, lag_30: float, rolling_mean_7: float):
    """
    Predict modal price for given inputs.
    Returns: predicted price and SHAP explanation
    """
    model = artifact['model']
    le_state = artifact['le_state']
    le_commodity = artifact['le_commodity']
    feature_cols = artifact['feature_cols']
    
    # Encode inputs
    try:
        state_enc = le_state.transform([state])[0]
    except ValueError:
        state_enc = 0  # unknown state
    try:
        commodity_enc = le_commodity.transform([commodity])[0]
    except ValueError:
        commodity_enc = 0
    
    # Create feature vector
    features = pd.DataFrame([{
        'month': month,
        'day_of_week': day_of_week,
        'day_of_year': day_of_year,
        'state_encoded': state_enc,
        'commodity_encoded': commodity_enc,
        'lag_7': lag_7,
        'lag_30': lag_30,
        'rolling_mean_7': rolling_mean_7
    }])
    
    # Predict
    prediction = float(model.predict(features)[0])
    
    # SHAP explanation
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(features)
    
    # Build explanation dict
    explanation = {}
    for i, col in enumerate(feature_cols):
        explanation[col] = float(shap_values[0][i])
    
    return {
        'predicted_price': round(prediction, 2),
        'shap_explanation': explanation,
        'base_value': float(explainer.expected_value)
    }
