import {MongoClient, ObjectId} from 'mongodb'
import * as express from 'express'
import {graphqlExpress, graphiqlExpress} from 'graphql-server-express'
import {makeExecutableSchema} from 'graphql-tools'
import cors from 'cors'
import * as bodyParser from "body-parser";

const prepare = (o) => {
    o._id = o._id.toString()
    return o
}


const app = express()

// app.use(cors())

const homePath = '/graphiql'
const URL = 'http://localhost'
const PORT = 3500
const MONGO_URL = 'mongodb://localhost:27017/cominglevel';


// @ts-ignore
const start = async () => {

    try {
        const db = await MongoClient.connect(MONGO_URL)

        const ProductsCollection = db.collection('products');

        const typeDefs = [`
          type Query {
            getProduct(_id: String): Product
            getAllProducts: [Product]
            getCategorizedProducts(_id: String): [Product]
          },
            
          type Product {
            title: String,
            sellPrice: Int,
            price: Int,
            image: String,
            cType: String,
            stockQty: Int
          }
      
          type Mutation {
            addProduct(  title: String, sellPrice: Int, price: Int, image: String, cType: String, stockQty: Int): Product
          }
    
          schema {
            query: Query
            mutation: Mutation
          }
        `];

        const resolvers = {
            Query: {
                getProduct: async (root, {_id}) => {
                    return prepare(await ProductsCollection.findOne(ObjectId(_id)))
                },
                getAllProducts: async () => {
                    return (await ProductsCollection.find({}).toArray()).map(prepare)
                },
                getCategorizedProducts: async (root, {_id}) => {
                    return prepare(await ProductsCollection.findOne(ObjectId(_id)))
                },
            },


            Mutation: {
                addProduct: async (root, args, context, info) => {
                    const res = await ProductsCollection.insertOne(args)
                    return prepare(res.ops[0])  // https://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~insertOneWriteOpResult
                },
            },
        }

        const schema = makeExecutableSchema({
            typeDefs,
            resolvers
        })

        app.use('/graphql', bodyParser.json(), graphqlExpress({schema}))

        app.use(homePath, graphiqlExpress({endpointURL: '/graphql'}))

        app.listen(PORT, () => {
            console.log(` Please click  ${URL}:${PORT}${homePath}`)
        })

    } catch (e) {
        console.log(e)
    }

}
start().then(r =>
console.log(`
//Sample queries

query {
  getAllProducts {
    title
    sellPrice
    price
    image
    cType
    stockQty
  } 
}

mutation {
  addProduct(title: "Apple", sellPrice: 75, price: 70, image: "No image", cType: "Fruits", stockQty: 10) {
    title
    sellPrice
    price
    image
    cType
    stockQty
  }
}
`));
