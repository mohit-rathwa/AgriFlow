import sys
import os
import predictor

def main():
    csv_path = r"c:\Users\mohit\OneDrive\Desktop\PROJECTS\IM_project\Dataset\mandi_daily_2019_2025.csv"
    if not os.path.exists(csv_path):
        print(f"Error: Dataset not found at {csv_path}")
        print("Please ensure the CSV file is in the correct location.")
        sys.exit(1)
        
    print(f"Starting training process using {csv_path}...")
    try:
        predictor.train_model(csv_path)
        print("Training completed successfully!")
    except Exception as e:
        print(f"An error occurred during training: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
