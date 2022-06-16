import { Schema, model, Document} from 'mongoose';
import { RsaPublicKey } from './rsa';



// 1. Create an interface representing a document in MongoDB.
 export interface WalletI extends Document {
  nickName : string 
  e: number,
  n : number
  amount: number      
};
  
    
  // 2. Create a Schema corresponding to the document interface.
const WalletSchema = new Schema<WalletI>({
    nickName : { type: String, required: true },
    e: { type: Number, required: true },
    n: { type: Number, required: true },
    amount: { type: Number, required: true }
    
  });


// 3. Create a Model.
export const WalletModel = model<WalletI>('Wallets', WalletSchema);  