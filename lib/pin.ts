/**
 * The app has two codes and they are different lengths: the login PIN unlocks
 * the account, the transaction PIN signs a payment. Both are declared here so
 * a screen and the route that validates its entry can never disagree.
 */
export const TRANSACTION_PIN_LENGTH = 4;
export const LOGIN_PIN_LENGTH = 6;
