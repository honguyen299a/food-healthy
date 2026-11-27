import { Body, Controller, Get, Post, Put, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/access.decorators';
import { AuthService } from './auth.service';
import { ChangePasswordDto, CredentialsDto, LoginDto } from './dto/auth.dto';
@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}
  @Public() @Post('register') async register(@Body() dto: CredentialsDto) {
    return this.service.register(dto);
  }
  @Public() @Post('login') async login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }
  @Get('me') async me(@Req() req: any) {
    return this.service.me(req);
  }
  @Put('password') async password(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.service.password(req, dto);
  }
}
