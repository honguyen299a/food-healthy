import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const role = this.reflector.getAllAndOverride<string>('role', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!role) return true;
    if (context.switchToHttp().getRequest().user?.role !== role) throw new ForbiddenException();
    return true;
  }
}
