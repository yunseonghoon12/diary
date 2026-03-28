import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const FirebaseUid = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ firebaseUser?: { uid: string } }>();
  return request.firebaseUser?.uid;
});
