import { Body, Controller, Get, Post, Put, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../services/prisma.service';
import { Public, CredentialsDto, LoginDto, ChangePasswordDto } from '../auth';

@Controller('auth')
export class AuthController {
  constructor(private db: PrismaService, private jwt: JwtService) {}
  private token(user: {id: number; email: string; role: string; usageMode: string; onboardingCompleted: boolean}) {
    return { accessToken: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }), user: { id: user.id, email: user.email, role: user.role, usageMode: user.usageMode, onboardingCompleted: user.onboardingCompleted } };
  }
  @Public() @Post('register') async register(@Body() dto: CredentialsDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new BadRequestException('Email đã được sử dụng');
    const user = await this.db.user.create({ data: { email, passwordHash: await bcrypt.hash(dto.password, 12) } });
    return this.token(user);
  }
  @Public() @Post('login') async login(@Body() dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.token(user);
  }
  @Get('me') async me(@Req() req: any) {
    return this.db.user.findUnique({ where: { id: req.user.sub }, select: { id: true, email: true, role: true, usageMode: true, onboardingCompleted: true, profile: true, manualTarget: true } });
  }
  @Put('password') async password(@Req() req: any, @Body() dto: ChangePasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    await this.db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) } });
    return { ok: true };
  }
}
