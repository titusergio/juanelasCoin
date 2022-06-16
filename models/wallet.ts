import { Schema, model, Document} from 'mongoose';
import { RsaPublicKey } from './rsa';



// 1. Create an interface representing a document in MongoDB.
 export interface WalletI extends Document {
  nickName : string 
  e: string,
  n : string
  amount: number      
};
  
    
  // 2. Create a Schema corresponding to the document interface.
const WalletSchema = new Schema<WalletI>({
    nickName : { type: String, required: true },
    e: { type: String, required: true },
    n: { type: String, required: true },
    amount: { type: Number, required: true }
    
  });


// 3. Create a Model.
export const WalletModel = model<WalletI>('Wallets', WalletSchema);  