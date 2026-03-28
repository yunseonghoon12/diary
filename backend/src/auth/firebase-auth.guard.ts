import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAuthService } from './firebase-auth.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAuth: FirebaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; firebaseUser?: { uid: string } }>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Firebase ID token');
    }
    const token = authHeader.slice(7);
    try {
      const decoded = await this.firebaseAuth.verifyIdToken(token);
      request.firebaseUser = { uid: decoded.uid };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }
}
