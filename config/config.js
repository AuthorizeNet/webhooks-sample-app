const env = 'dev'; // 'dev' or 'test'

const dev = {
    apiEndpoint: 'https://apitest.authorize.net/rest/v1',
    apiLoginId: process.env.apiLogin || 'your api login id',
    transactionKey: process.env.transactionKey || 'your transaction key',
    app: {
        port: parseInt(process.env.PORT) || 9000,
        host: process.env.APP_DB_HOST || '0.0.0.0'
    },
    db: {
        name: process.env.DEV_DB_NAME || 'notification.db',
        size: 1000
    },
    graph: {
        // Number of Days to show in payment, refund, fraud and customer charts
        noOfDays: 7,
        maxNotificationCount: 100,
        // In seconds - interval between each time in X axis.
        intervalTimeSeconds: 300,
        graphTimeScale: 12 // Number of time intervals to show in graph
    }
};

const test = {
    apiEndpoint: 'https://apitest.authorize.net/rest/v1',
    apiLoginId: process.env.apiLogin || 'your api login id',
    transactionKey: process.env.transactionKey || 'your transaction key',
    app: {
        port: parseInt(process.env.PORT) || 9000,
        host: process.env.APP_DB_HOST || '0.0.0.0'
    },
    db: {
        name: process.env.DEV_DB_NAME || 'testnotification.db',
        size: 1000
    },
    graph: {
        // Number of Days to show in payment, refund, fraud and customer charts
        noOfDays: 7,
        maxNotificationCount: 100,
        // In seconds - interval between each time in X axis.
        intervalTimeSeconds: 300,
        graphTimeScale: 12 // Number of time intervals to show in graph
    }
};

const config = {
    dev,
    test
};

module.exports = config[env];