import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCLyeHx6OFOnZPN\nBqHqjDhhJJgz0cHvvKuN0AeUFuJDuhfeWBKC7doYJ56xeo6FHN/rZoM3xJwd2AhC\nReQegm6s/z+2ZK5/1ZK0MF0wlY34PYPm4hHbmAPtpY/4rNTeC69aIqhwsopfMJpe\nEChMSGu5wVRSK6WjRkI1bqCF0IHsFvr3+5gKWWYfhN51iScct29wIjS+Z3TiU638\njLzh3IbmyfZlYwS4X45Tu0zMKUTkUhTfriXo0Jv8NIO2D+WmzzJyy4yPFVzpk+2z\njarjXX4xWb+3WKp4oWsg019xkBSO9Lhrrc7aopg4YZ69nrzAi/rBuKDEWOURjiFQ\nsNuCu7lhAgMBAAECggEAA84/BXv5x+i7h/hnQUbVMU4/iogD+wffti1BffZr7VYZ\nC9rJkW2/FngPQ1uuNGq6oEkBLewY9MMKroTPY6xylBxUdFDw/NZbd3/3LLk8AG2E\nTfo+BdFxdSKg9Pv9+GTIpSNbNjFvwCZ6Y8pi0awJd49cDh48FMh3Fi211w7Ivemn\nJbYdMITbS7obyY4ss5bTztCKuJEAFshcuz8FF87vYUTpbYPKgJG+hLWeip2gERvB\nH76vCM9sPvnAaSiYaoqIFPrvkx4JJnRaW+FYfwdXkjipMsiMyy2WXqj242pMtM+U\nLMmz15UTS3RHAKcj2FwCIa0HXba9b4eyF9q2eNfGZQKBgQDA39lDFWDI8e1TWtil\nFrSs19AjfiVTZE+Qnan/gU7U4FIvfkhTyXppa6EzjUFHV98Z2KAtA7plTOw9ASZ8\nbPLv1fQDNuXQFB24CGqfPihTu2QoJzlEIZgfKpwljphSQQP56PyxwuY3WxPyWMaq\n/n7DqIr1RmWTB/Jt4TOPUhwd8wKBgQC5ijF4E5VhQzMeVgKg70PJVSZQkXrxDiaB\nWPPZ+70/NesfT/U9b6YdS18bInkRNxMSoWHiIAytqPDXJfIcEhhCzCjeToN6KxOq\nHQvcuwLrKXNHdxQCt3Vul2mYeP503asK9lsMjSxPzN1KWTrxX9D/TPPIinm9yD9w\nWcP1Y8+cWwKBgQC+DtdE55gL63n1nZvGcm1vtOqBTxjw5/QPiY2vHXjVBId4DXSw\nO+XIZCrhZdxhtRE/otuUAAx5LifMpYmLKsDp3Wcqk7o6JNh0NLb8XH/Yotu7RYuE\nu6XvcEmWKMGorDCC3zfC40+AVNt/AEQk08uOelMUB16oWDhoVnY8UKksSQKBgQCc\niooeY3d/bnEswSjKm9S3g44mH/h4dZXrQB/N5OXQ9S8BZjbltNOUl8kQXc+DxNHk\nwCCT5rKLuqQpAiz5nhK2GQbKObgYVUvsFUGy5F4cBwbqXv+VIzCDNGC1cjBObdAo\nGZ7MQjgGxDRYzFw81rjBDi4JHzyD8PYFVtdMrP+3TQKBgCBaik5oW24qZUy6jLZD\nxXZS0+zaB7MYeS4rx03LLmSuQMZ6m/QA5qI9X18nHdMDFwEQDGatO1T3uAUyf6EE\n6S3t3UUiF0L1lOFTqULDU/KIJ2U05cgfzZRYt4mCsM6BI5UlfHHa7tRfiJ2GvBL9\nIaUnTiI+JQTOruvDjp93FQFi\n-----END PRIVATE KEY-----\n',
      clientEmail:
        'firebase-adminsdk-l3q82@ia-spion-trade.iam.gserviceaccount.com',
      projectId: 'ia-spion-trade',
    }),
    databaseURL: `https://ia-spion-trade.firebaseio.com`,
  });
}

const auth = admin.auth();

const db = admin.firestore();

export { admin, auth, db };
