require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const DailyPrice = require('../src/models/DailyPrice');
const env = require('../src/config/env');

const CSV_FILE_PATH = 'c:\\Users\\mohit\\OneDrive\\Desktop\\PROJECTS\\IM_project\\Dataset\\mandi_daily_2019_2025.csv';
const BATCH_SIZE = 5000;

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const mapRowToSchema = (row) => {
  // Try to be flexible with column names
  const commodity = row['commodity'] || row['Commodity'] || row['COMMODITY'];
  const variety = row['variety'] || row['Variety'] || row['VARIETY'];
  const arrivalDateStr = row['report_date'] || row['Arrival_Date'] || row['arrival_date'];
  const minPrice = row['min_price'] || row['Min_Price'] || row['MIN_PRICE'];
  const maxPrice = row['max_price'] || row['Max_Price'] || row['MAX_PRICE'];
  const modalPrice = row['modal_price'] || row['Modal_Price'] || row['MODAL_PRICE'];
  const state = row['state_name'] || row['State'] || row['state'];
  const district = row['district_name'] || row['District'] || row['district'];
  const mandiName = row['market_center'] || row['Market'] || row['market'];

  if (!commodity || !modalPrice || !arrivalDateStr || !state || !mandiName) {
    return null; // Skip invalid rows
  }

  let arrivalDate;
  try {
    arrivalDate = new Date(arrivalDateStr);
    if (isNaN(arrivalDate.getTime())) {
      // attempt manual parse if standard format fails
      const parts = arrivalDateStr.split('/');
      if (parts.length === 3) {
        arrivalDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  } catch (e) {
    arrivalDate = new Date();
  }

  return {
    commodity,
    variety,
    arrivalDate,
    minPrice: parseFloat(minPrice) || null,
    maxPrice: parseFloat(maxPrice) || null,
    modalPrice: parseFloat(modalPrice),
    state,
    district,
    mandiName,
    source: 'agmarknet'
  };
};

const seedData = async () => {
  await connectDB();
  
  console.log('Starting data import...');
  let batch = [];
  let count = 0;
  let skipped = 0;
  
  const processBatch = async (items) => {
    try {
      await DailyPrice.insertMany(items);
    } catch (error) {
      console.error('Batch insert error:', error.message);
    }
  };

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', async (row) => {
      const doc = mapRowToSchema(row);
      if (doc) {
        batch.push(doc);
        count++;
        
        if (batch.length >= BATCH_SIZE) {
          const itemsToInsert = [...batch];
          batch = []; // clear batch immediately so stream doesn't wait
          await processBatch(itemsToInsert);
        }

        if (count % 100000 === 0) {
          console.log(`Processed ${count} rows...`);
        }
      } else {
        skipped++;
      }
    })
    .on('end', async () => {
      // insert remaining
      if (batch.length > 0) {
        await processBatch(batch);
      }
      
      console.log(`\nImport complete!`);
      console.log(`Total inserted: ${count}`);
      console.log(`Total skipped: ${skipped}`);
      
      console.log('Creating/verifying indexes...');
      await DailyPrice.syncIndexes();
      console.log('Indexes synced.');
      
      process.exit(0);
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      process.exit(1);
    });
};

seedData();
