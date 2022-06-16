import * as crypto from 'crypto';
import mongoose from 'mongoose';
import express from 'express';
import { WalletI, WalletModel } from './models/wallet';
import * as rsa from './models/rsa'


const PORT = 4000
const CONNECTION_URL = "mongodb+srv://titu:titu1234@cluster0.qghtm.mongodb.net/Database?retryWrites=true&w=majority"
const app = express();

console.log("starting...")



mongoose.connect(CONNECTION_URL)                         
  .then(() => app.listen(PORT, () => console.log(`Base MongoDB conectado, servidor corriendo en el puerto: http://localhost:${PORT}`)))

  .catch((error) => console.log(`${error} no se pudo conectar`));


// Transfer of funds between two wallets
class Transaction {
  constructor(
    public amount: number, 
    public payer: string, // public key
    public payee: string // public key
  ) {}

  toString() {
    return JSON.stringify(this);
  }
}

// Individual block on the chain
class Block {

  public nonce = Math.round(Math.random() * 999999999);

  constructor(
    public prevHash: string, 
    public transaction: Transaction, 
    public ts = Date.now()
  ) {}

  get hash() {
    const str = JSON.stringify(this);
    const hash = crypto.createHash('SHA256');
    hash.update(str).end();
    return hash.digest('hex');
  }
}


// The blockchain
class Chain {
  // Singleton instance
  public static instance = new Chain();

  chain: Block[];

  constructor() {
    this.chain = [
      // Genesis block
      new Block('', new Transaction(100, 'genesis', 'satoshi'))
    ];
  }

  // Most recent block
  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Proof of work system
  mine(nonce: number) {
    let solution = 1;
    console.log('⛏️  mining...')

    while(true) {

      const hash = crypto.createHash('MD5');
      hash.update((nonce + solution).toString()).end();

      const attempt = hash.digest('hex');

      if(attempt.substr(0,4) === '0000'){
        console.log(`Solved: ${solution}`);
        return solution;
      }

      solution += 1;
    }
  }

  // Add a new block to the chain if valid signature & proof of work is complete
  addBlock(transaction: Transaction, senderPublicKey: string, signature: Buffer) {
    const verify = crypto.createVerify('SHA256');
    verify.update(transaction.toString());

    const isValid = verify.verify(senderPublicKey, signature);

    if (isValid) {
      const newBlock = new Block(this.lastBlock.hash, transaction);
      this.mine(newBlock.nonce);
      this.chain.push(newBlock);
    }
  }

}

// Wallet gives a user a public/private keypair
class Wallet {
  public publicKey: string;
  public privateKey: string;
  public money: number;
  
  constructor() {

    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    
    this.money = 200; //Empizan todos con 200$
    this.privateKey = keypair.privateKey;
    this.publicKey = keypair.publicKey;
  }

  sendMoney(amount: number, payeePublicKey: string) {
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey);

    const sign = crypto.createSign('SHA256');
    sign.update(transaction.toString()).end();

    const signature = sign.sign(this.privateKey); 
    Chain.instance.addBlock(transaction, this.publicKey, signature);

    this.money = this.money - amount;

    console.log(this.money)
  }
}

async function getWallets() {
  try{
    const wallets: WalletI[] = await WalletModel.find(); 
    console.log("wallets: ", wallets)

  }catch(error){
    console.log("error: ", error)
  }

}

async function setWallet(name: string, initialAmount : number) {

  const keyPair = await rsa.generateKeys(2049)
  let walletA = {
    nickName : name,
    e: Number(keyPair.publicKey.e),
    n: Number(keyPair.publicKey.n),
    amount : initialAmount
  }
  const walletAMongoose = new WalletModel(walletA);
  console.log("1", walletAMongoose)

    try{
        await walletAMongoose.save();
        console.log("saved ? ", walletAMongoose)
        

    } catch (error:any) {
      console.log("error: ", error)
        
    }
    
}


setWallet("SergioGras", 21)
//getWallets()





/*
//Conexion con Mongo
mongoose
  .connect(config.mongo.url, config.mongo.options)
  .then((result) => {
    logging.info(NAMESPACE, 'Connected to mongoDB!');
  })
  .catch((error) => {
    logging.error(NAMESPACE, error.message, error);
  });
*/

/*
// Example usage

const satoshi = new Wallet();
const bob = new Wallet();
const alice = new Wallet();

satoshi.sendMoney(50, bob.publicKey);
bob.sendMoney(23, alice.publicKey);
alice.sendMoney(5, bob.publicKey);

console.log(Chain.instance)

*/
