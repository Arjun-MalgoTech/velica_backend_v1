import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import { MONGO_URI } from '../config/index.js';


dotenv.config();


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); 
    }
};
export default connectDB;
