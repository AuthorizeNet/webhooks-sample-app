# Webhooks Sample App

Webhook sample application to demonstrate the usage of Webhooks to monitor real time events from Authorize.Net. 

 * To learn more about Webhooks creation and configuration, authentication, API endpoints, event types and payload, visit [Webhooks](https://developer.authorize.net/api/reference/features/webhooks.html) 

 * To get started with Authorize.Net, set up [Sandbox account](https://developer.authorize.net/hello_world/) and play. 

## Screenshots

#### Live Event Tracker 

Tracks live event occurrence and can be filtered based on the event types. 

![Live Event Tracker image](/public/images/livechart_filtered.PNG) 

#### Recent Notifications 

Displays recent notifications. Can be filtered by event type using the drop down. 

![Recent Notifications image](/public/images/recent_notifications.PNG) 

#### Dashboard Charts 

Payment, Refund, Customer and Fraud charts are displayed for past 7 days by default. 

![Dashboard charts image](/public/images/maincharts.PNG) 

## Register and configure Webhooks 

### Prerequites 
 * Authorize.NET production or sandbox credentials (api login id and transaction key)

### Steps to register a Webhook endpoint in Sandbox account
 * Login to [Sandbox](https://sandbox.authorize.net/) using sandbox account credentials. 

 * Select the ACCOUNTS tab and click "Webhooks" link under Business Settings.  

 * In Webhooks page, select "Add Endpoint" button. 

 * Suppose this app is hosted as "https://my-webhooks-app.com" then enter "https://my-webhooks-app.com/notifications" in the Endpoint URL field. 

 * Select the events for which you need to get notified in the app and click save button. Now the webhook is successfully configured to receive notifications. 


## Installation 

Ensure that you have Node.js installed. node v8.11.2 and npm v5.6.0 are used for development. Please install the above or latest versions to use the app. 

The official Node.js website has installation instructions for Node.js: https://nodejs.org. 

Clone the Repository. Go to the project Directory and follow the below steps

To install necessary packages, run following command in the terminal.

```
npm install
```
## Usage

In your terminal, run the following command:

```
npm start
```

The server is started at a port number (displayed in console) Eg. 9000. 
If you see no error message, navigate to `http://localhost:9000` in your browser.

## Config file

config.js file in /config folder contains the following information: 

1. API end point and credentials (required to populate the event types dropdown menu). In config/config.js file, 

```
apiEndpoint: 'https://apitest.authorize.net/rest/v1', 
apiLoginId: process.env.apiLogin || 'enter your api login id here', 
transactionKey: process.env.transactionKey || 'enter your transaction key here', 
```

2. Server port number and hostname.  

```
port: parseInt(process.env.PORT) || 9000,
host: process.env.APP_DB_HOST || '0.0.0.0'
```

3. Database name and size.

```
name: process.env.DEV_DB_NAME || './db/notification.db',
size: 1000
```

4. Graph Parameters: 

    a) noOfDays: Number of days to plot in the graph for Payment, Refund, Customer and Fraud charts. 
    Example: If noOfDays = 7:- Above 4 charts are shown for last 7 days. 
    
    b) maxNotificationCount: Maximum number of recent notifications to display.  
    
    c) intervalTimeSeconds: Interval time in seconds between each points in X axis for live event chart. 
    
    d) graphTimeScale: Number of intervals to plot in live event chart. 
    
    Example: If intervalTimeSeconds = 300 and graphTimeScale = 12:- live event chart is displayed for each 5 minutes for last one hour.
    
## Database File 

By default a database file to store recent notifications is created at /db/notification.db. Initially the live event chart is not displayed, notification log in UI does not contain any recent notifications and also empty charts are displayed in dashboard tab of the application since the server is just started and database is empty. When the server begins to receive notifications, charts and notification logs are updated. 

## UI 

1. Two tabs namely "Live Event Monitoring" and "Dashboard" are present. 
2. First tab shows the Live Event chart at the top and live notification monitor at the bottom. A dropdown is present to filter the notifications by event type. 
3. Second tab contains charts of Payment amount, Refund amount, number of Customers created and number of fraud transactions held in last few days. 


