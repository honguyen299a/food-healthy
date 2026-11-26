import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaErrorFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = error.code === 'P2002' ? HttpStatus.CONFLICT : error.code === 'P2025' ? HttpStatus.NOT_FOUND : error.code === 'P2003' ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = status === 409 ? 'Dữ liệu đã tồn tại' : status === 404 ? 'Không tìm thấy dữ liệu' : status === 400 ? 'Dữ liệu đang được sử dụng hoặc không hợp lệ' : 'Lỗi dữ liệu';
    response.status(status).json({ statusCode: status, message });
  }
}
