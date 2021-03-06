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



/*
mongoose.connect(CONNECTION_URL)                         
  .then(() => app.listen(PORT, () => console.log(`Base MongoDB conectado, servidor corriendo en el puerto: http://localhost:${PORT}`)))

  .catch((error) => console.log(`${error} no se pudo conectar`));

  */

interface publicKeyI {
  e : bigint,
  n : bigint
}

interface transactionLiteral {
  amount: number,
  payerN : string , //base64
  payedN : string   //base64

}





// ********** TRANSFER of funds between two wallets *************************
class Transaction {
  constructor(
    public amount: number, 
    public payer: publicKeyI, // public key
    public payed: publicKeyI // public key
  ) {}

  serialize() {
    return this.amount
  }

  toLiterals() : string {

    const obj = {
      amount : this.amount,
      payerN : bc.bigintToBase64(this.payer.n),
      payedN : bc.bigintToBase64(this.payed.n),

    }
    
      const str = JSON.stringify(obj);
      const hash = crypto.createHash('SHA256');
      hash.update(str).end();
      return hash.digest('hex');
    }

  fromLiterals(obj:transactionLiteral): Transaction {

  return new Transaction(obj.amount, new rsa.RsaPublicKey(65537n, bc.base64ToBigint(obj.payerN)), new rsa.RsaPublicKey(65537n, bc.base64ToBigint(obj.payerN)))

  }
}





// ************INDIVIDUAL BLOCK IN THE CHAIN*******************************
class Block {

 // public nonce = Math.round(Math.random() * 999999999);  // === hash(trans)
 //public nonce:number

 //obj nonce+trans

  constructor(
    public prevHash: string, 
    public transaction: Transaction, //objTrans
    public ts = Date.now()
  ) {}

  get hash() {
    const obj = {
      hash : this.prevHash,
      transaction : this.transaction.toLiterals(),
      date : this.ts.toString()

    }
    const str = JSON.stringify(obj);
    const hash = crypto.createHash('SHA256');
    hash.update(str).end();
    return hash.digest('hex');
  }
}





// ***********BLOCKCHAIN********************************************
class Chain {
  // Singleton instance
  public static instance = new Chain();

  firstSender =  {
    e : 65537n,
    n : 3432452597n
  }

  firstReceiver =  {
    e : 65537n,
    n : 9725361125n
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
  mine(blockHash: string) {

    let solution = 1;
    let nonce = solution.toString()
    console.log('??????  mining...')
    const start = new Date().getTime()

    while(true) {

      const hash = crypto.createHash('MD5');
      hash.update((blockHash + nonce).toString()).end();

      const attempt = hash.digest('hex');

      //console.log(attempt)

      if(attempt.substr(0,4) === '0000'){
        console.log(`Solved: ${solution}`);
        let elapsed = new Date().getTime() - start;
        console.log("Time required to mine the block: ", elapsed)
        return solution;
      }

      solution += 1;
      nonce = solution.toString()
    }
  }

  // Add a new block to the chain if valid signature & proof of work is complete
  addBlock(transaction: Transaction, senderPublicKey: rsa.RsaPublicKey , signature: bigint) {

    

    //Validate is sender has signed the actual transaction
    if (bc.hexToBigint(transaction.toLiterals()) == senderPublicKey.verify(signature)) {
      console.log("verified")
      const newBlock = new Block(this.lastBlock.hash, transaction);
      this.mine(newBlock.hash);
      this.chain.push(newBlock);
    }else{
      console.log("fraudulent transaction")
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

    const signature : bigint = this.privateKey.sign(bc.hexToBigint(transaction.toLiterals()))

    Chain.instance.addBlock(transaction, this.publicKey, signature);

    this.money = this.money - amount;
    payeeWallet.money = payeeWallet.money + amount

    //console.log(this.money)
  }
}










//Test JUANELASCOIN

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