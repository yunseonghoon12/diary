declare module 'express-serve-static-core' {
  interface Request {
    firebaseUser?: { uid: string };
  }
}
export {};
