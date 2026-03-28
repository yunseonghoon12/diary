import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthService implements OnModuleInit {
  onModuleInit() {
    if (admin.apps.length) return;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return;
    }

    try {
      admin.initializeApp();
    } catch {
      // 로컬에서 서비스 계정 미설정 시: 토큰 검증은 실패할 수 있음
    }
  }

  verifyIdToken(idToken: string) {
    return admin.auth().verifyIdToken(idToken);
  }
}
