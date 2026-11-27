import { IsEmail, IsString, MinLength } from 'class-validator';

export class CredentialsDto {
  @IsEmail({}, { message: 'Vui lòng nhập email hợp lệ' }) email: string;
  @IsString({ message: 'Vui lòng nhập mật khẩu' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Vui lòng nhập email hợp lệ' }) email: string;
  @IsString({ message: 'Vui lòng nhập mật khẩu' })
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu' })
  password: string;
}

export class ChangePasswordDto {
  @IsString({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword: string;
  @IsString({ message: 'Vui lòng nhập mật khẩu mới' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  newPassword: string;
}
