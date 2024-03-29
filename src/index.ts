import {MongoClient} from 'mongodb'
import * as express from 'express'
import {graphqlExpress, graphiqlExpress} from 'graphql-server-express'
import {makeExecutableSchema} from 'graphql-tools'
import * as bodyParser from "body-parser";
// import cors from 'cors'
// app.use(cors())

const prepare = (o) => {
    o._id = o._id.toString()
    return o
}

const app = express()
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
            getProduct(title: String): Product
            getAllProducts: [Product]
            getCategorizedProducts(cType: String): [Product]
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
            deleteProduct(  title: String): String
            updateQtyOfProduct( title: String, stockQty: Int) :Product
          }
    
          schema {
            query: Query
            mutation: Mutation
          }
        `];

        const resolvers = {
            Query: {
                getProduct: async (root, {title}) => {
                    return prepare(await ProductsCollection.findOne({title: title}))
                },
                getAllProducts: async () => {
                    return (await ProductsCollection.find({}).toArray()).map(prepare)
                },
                getCategorizedProducts: async (root, {cType}) => {
                    return (await ProductsCollection.find({cType: cType}).toArray()).map(prepare)
                },
            },

            Mutation: {
                addProduct: async (root, args, context, info) => {
                    const res = await ProductsCollection.insertOne(args)
                    return prepare(res.ops[0])  // https://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~insertOneWriteOpResult
                },

                deleteProduct: async (root, args, context, info) => {
                    const res = await ProductsCollection.remove(args)
                    return prepare(res.ops[0])
                },
                updateQtyOfProduct: async  (root, args, context, info) => {
                    const res = await ProductsCollection.update({title: args.title},{$set :{stockQty: args.stockQty}})
                    return prepare(res.ops[0])
                }
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

query{
  getProduct(title: "Banana") {
    title
    sellPrice
    price
    image
    cType
    stockQty
  }
}

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

query{
  getCategorizedProducts(cType:"Fruits") {
    title
    sellPrice
    price
    image
    cType
    stockQty
  }
}

mutation{
   deleteProduct(title: "Onion")
}

mutation{
  updateQtyOfProduct(title:"Mango", stockQty: 35) {
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
