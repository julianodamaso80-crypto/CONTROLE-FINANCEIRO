import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => WhatsAppModule)],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
