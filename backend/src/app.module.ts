import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppConfigModule } from './common/config/app-config.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { SegmentsModule } from './modules/segments/segments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AdminModule } from './modules/admin/admin.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global com três janelas de proteção
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    AppConfigModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    CategoriesModule,
    ClientsModule,
    SuppliersModule,
    BankAccountsModule,
    SegmentsModule,
    TransactionsModule,
    DashboardModule,
    WhatsAppModule,
    AdminModule,
    SubscriptionsModule,
    WebhooksModule,
    HealthModule,
  ],
  providers: [
    // Ordem importa: Throttler → JWT → Subscription
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SubscriptionGuard,
    },
  ],
})
export class AppModule {}
