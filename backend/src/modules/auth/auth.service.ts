import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { ChangePasswordDto, CredentialsDto, LoginDto } from './dto/auth.dto';
@Injectable()
export class AuthService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
  ) {}
  private token(user: {
    id: number;
    email: string;
    role: string;
    usageMode: string;
    onboardingCompleted: boolean;
  }) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        usageMode: user.usageMode,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }
  async register(dto: CredentialsDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } }))
      throw new BadRequestException('Email đã được sử dụng');
    const user = await this.db.user.create({
      data: { email, passwordHash: await bcrypt.hash(dto.password, 12) },
    });
    return this.token(user);
  }
  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.token(user);
  }
  async me(req: any) {
    return this.db.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        role: true,
        usageMode: true,
        onboardingCompleted: true,
        profile: true,
        manualTarget: true,
      },
    });
  }
  async password(req: any, dto: ChangePasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash)))
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    await this.db.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });
    return { ok: true };
  }
}
