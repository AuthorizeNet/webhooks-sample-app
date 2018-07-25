const env = process.env.NODE_ENV || 'dev'; // 'dev' or 'test'

const dev = {
    app: {
        port: parseInt(process.env.DEV_APP_PORT) || 9000,
        host: process.env.APP_DB_HOST || 'localhost'
    },
    db: {
        name: process.env.DEV_DB_NAME || 'notification.db',
        size: 200
    },
    graph: {
        noOfDays: 7,
        intervalTimeSeconds: 43200,
        graphTimeScale: 12 // Number of time intervals to show in graph
    }
};

const test = {
    app: {
        port: parseInt(process.env.TEST_APP_PORT) || 1337,
        host: process.env.APP_DB_HOST || 'localhost'
    },
    db: {
        name: process.env.DEV_DB_NAME || 'notification.db',
        size: 5
    },
    graph: {
        noOfDays: 7,
        intervalTimeSeconds: 3600,
        graphTimeScale: 4 // Number of time intervals to show in graph
    }
};

const config = {
    dev,
    test
};

module.exports = config[env];