# webhooks-sample-app

Webhook Dashboard for Merchants to monitor real time events and recent business happenings 

## Installation 

Ensure that you have Node.js installed. The official Node.js website has installation instructions for Node.js: https://nodejs.org. 

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

1. API end point and credentials (required to populate the event types dropdown menu). 
2. Server port number, database name and size. 
3. Graph Parameters: 
    a) noOfDays: Number of days to plot in the graph for Payment, Refund, Customer and Fraud charts. 
    Example: If noOfDays = 7:- Above 4 charts are shown for last 7 days.
    b) maxNotificationCount: Maximum number of recent notifications to display. 
    c) intervalTimeSeconds: Interval time in seconds between each points in X axis for live event chart. 
    d) graphTimeScale: Number of intervals to plot in live event chart. 
    Example: If intervalTimeSeconds = 300 and graphTimeScale = 12:- live event chart is displayed for each 5 minutes for last one hour.
    
## Database File 

By default a database file to store recent notifications is created at /db/notification.db. Initially this file is empty. So live event chart is not displayed and notification log in UI does not contain any notifications. Empty charts are displayed in dashboard tab of the application. When the server begins to receive notifications, charts and notification logs are updated. 

## UI 

1. Two tabs namely "Live Event Monitoring" and "Dashboard" are present. 
2. First tab shows the Live Event chart at the top and live notification monitor at the bottom. A dropdown is present to filter the notifications by event type. 
3. Second tab contains charts of Payment amount, Refund amount, number of Customers created and nunumber of fraud transactions held in last few days. 
