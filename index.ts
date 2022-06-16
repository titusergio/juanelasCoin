import * as crypto from 'crypto';
import mongoose from 'mongoose';
import express from 'express';
import { WalletI, WalletModel } from './models/wallet';
import * as rsa from './models/rsa'
import * as bc from "bigint-conversion";


const PORT = 4000
const CONNECTION_URL = "mongodb+srv://titu:titu1234@cluster0.qghtm.mongodb.net/Database?retryWrites=true&w=majority"
const app = express();

console.log("starting...")



mongoose.connect(CONNECTION_URL)                         
  .then(() => app.listen(PORT, () => console.log(`Base MongoDB conectado, servidor corriendo en el puerto: http://localhost:${PORT}`)))

  .catch((error) => console.log(`${error} no se pudo conectar`));


interface publicKeyI {
  e : bigint,
  n : bigint
}

// Transfer of funds between two wallets
class Transaction {
  constructor(
    public amount: number, 
    public payer: publicKeyI, // public key
    public payee: publicKeyI // public key
  ) {}

  serialize() {
    return this.amount
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
    const str = JSON.stringify(this.prevHash + this.nonce + this.ts);
    const hash = crypto.createHash('SHA256');
    hash.update(str).end();
    return hash.digest('hex');
  }
}





// The blockchain
class Chain {
  // Singleton instance
  public static instance = new Chain();

  firstSender =  {
    e : 1234n,
    n : 3432525n
  }

  firstReceiver =  {
    e : 1234n,
    n : 3432125n
  }

  chain: Block[];

  constructor() {
    
    this.chain = [
      // Genesis block
      new Block('', new Transaction(100, this.firstSender, this.firstReceiver))
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
    const start = new Date().getTime()

    while(true) {

      const hash = crypto.createHash('MD5');
      hash.update((nonce + solution).toString()).end();

      const attempt = hash.digest('hex');

      if(attempt.substr(0,5) === '00000'){
        console.log(`Solved: ${solution}`);
        let elapsed = new Date().getTime() - start;
        console.log("Time required to mine the block: ", elapsed)
        return solution;
      }

      solution += 1;
    }
  }

  // Add a new block to the chain if valid signature & proof of work is complete
  addBlock(transaction: Transaction, senderPublicKey: rsa.RsaPublicKey , signature: bigint) {
    
    //Validate is sender has signed the actual transaction
    if (BigInt(transaction.serialize()) == senderPublicKey.verify(signature)) {
      console.log("verified")
      const newBlock = new Block(this.lastBlock.hash, transaction);
      this.mine(newBlock.nonce);
      this.chain.push(newBlock);
    }
  }

}





// Wallet gives a user a public/private keypair
class Wallet {
  public publicKey: rsa.RsaPublicKey;
  public privateKey: rsa.RsaPrivateKey;
  public money: number;
  public nickName : string;

  

   constructor( amount: number, name : string, keyPair : rsa.rsaKeyPair) {
    
    this.publicKey = keyPair.publicKey; 
    this.privateKey = keyPair.privateKey;
    this.money = amount;
    this.nickName = name;
  }

  

  sendMoney(amount: number, payeePublicKey: rsa.RsaPublicKey, payeeWallet : Wallet) {
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey);

    const signature : bigint = this.privateKey.sign(BigInt(transaction.serialize()))

    Chain.instance.addBlock(transaction, this.publicKey, signature);

    this.money = this.money - amount;
    payeeWallet.money = payeeWallet.money + amount

    //console.log(this.money)
  }
}




/*

async function getWallets() {
  try{
    const wallets: WalletI[] = await WalletModel.find(); 
    console.log("wallets loaded ")
    

  }catch(error){
    console.log("error: ", error)
    
  }

}

async function setWallet(name: string, initialAmount : number) {

  const keyPair = await rsa.generateKeys(2049)
  let walletA = {
    nickName : name,
    e: bc.bigintToText((keyPair.publicKey.e)),
    n: bc.bigintToText((keyPair.publicKey.n)),
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

*/

async function testJuanelasTransactions(){
  const AliceKeys =  await rsa.generateKeys(2049)
  const AliceWallet = new Wallet(10, "Alice", AliceKeys)
  const BobKeys =  await rsa.generateKeys(2049)
  const BobWallet = new Wallet(20,"Bob", BobKeys)

  AliceWallet.sendMoney(6, BobKeys.publicKey, BobWallet)
  BobWallet.sendMoney(1, AliceKeys.publicKey, AliceWallet)

  console.log("Alice expected amount is (10-6+1)= 5, actual salary is: ", AliceWallet.money)
  console.log("Bob expected amount is (20+6-1)= 5, actual salary is: ", BobWallet.money)
  console.log("Actual blockchain: ", Chain.instance)
  
}

testJuanelasTransactions()