const env = process.env.NODE_ENV || 'dev'; // 'dev' or 'test'

const dev = {
    apiEndpoint: 'https://apitest.authorize.net/rest/v1',
    apiLoginId: process.env.apiLogin || 'enter your api login id here',
    transactionKey: process.env.transactionKey || 'enter your transaction key here' ,
    app: {
        port: parseInt(process.env.DEV_APP_PORT) || 9000
    },
    db: {
        host: process.env.DEV_DB_HOST || 'localhost',
        port: parseInt(process.env.DEV_DB_PORT) || 27017,
        name: process.env.DEV_DB_NAME || 'db'
    },
};

const test = {
    apiEndpoint: 'https://apitest.authorize.net/rest/v1',
    apiLoginId: 'enter your api login id here',
    transactionKey: 'enter your transaction key here',
    app: {
        port: parseInt(process.env.TEST_APP_PORT) || 3000
    },
    db: {
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT) || 27017,
        name: process.env.TEST_DB_NAME || 'test'
    }
};

const config = {
 dev,
 test
};

module.exports = config[env];