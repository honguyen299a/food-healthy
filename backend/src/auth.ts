import {
  Injectable,
  UnauthorizedException,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IsEmail, IsString, MinLength } from "class-validator";
import { PrismaService } from "./services/prisma.service";

export class CredentialsDto {
  @IsEmail({}, { message: "Vui lòng nhập email hợp lệ" }) email: string;
  @IsString({ message: "Vui lòng nhập mật khẩu" })
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
  password: string;
}
export class LoginDto {
  @IsEmail({}, { message: "Vui lòng nhập email hợp lệ" }) email: string;
  @IsString({ message: "Vui lòng nhập mật khẩu" })
  @MinLength(1, { message: "Vui lòng nhập mật khẩu" })
  password: string;
}
export class ChangePasswordDto {
  @IsString({ message: "Vui lòng nhập mật khẩu hiện tại" })
  @MinLength(1, { message: "Vui lòng nhập mật khẩu hiện tại" })
  currentPassword: string;
  @IsString({ message: "Vui lòng nhập mật khẩu mới" })
  @MinLength(8, { message: "Mật khẩu mới phải có ít nhất 8 ký tự" })
  newPassword: string;
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    private db: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>("public", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync(token);
      const current = await this.db.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true },
      });
      if (!current) throw new UnauthorizedException();
      req.user = { ...payload, role: current.role };
      return true;
    } catch {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ");
    }
  }
}
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const role = this.reflector.getAllAndOverride<string>("role", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!role) return true;
    if (context.switchToHttp().getRequest().user?.role !== role)
      throw new ForbiddenException();
    return true;
  }
}
export const Public = () => SetMetadata("public", true);
export const Admin = () => SetMetadata("role", "ADMIN");
export const UserOnly = () => SetMetadata("role", "USER");
