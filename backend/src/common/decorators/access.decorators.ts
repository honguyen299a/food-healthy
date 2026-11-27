import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('public', true);

export const Admin = () => SetMetadata('role', 'ADMIN');

export const UserOnly = () => SetMetadata('role', 'USER');
