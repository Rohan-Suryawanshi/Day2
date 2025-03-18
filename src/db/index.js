import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb= async()=> {
  try{
    const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`Mongodb is connected DB_HOST ${connectionInstance.connection.host}`);
  }
  catch(error)
  {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
}

export default connectDb;