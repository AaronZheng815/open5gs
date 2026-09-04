import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriberModule } from './modules/subscriber/subscriber.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AccountModule } from './modules/account/account.module';
import { AssetModule } from './modules/asset/asset.module';
import { ConfigModule as NmsConfigModule } from './modules/config/config.module';
import { LifecycleModule } from './modules/lifecycle/lifecycle.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI') ?? 'mongodb://localhost/open5gs',
      }),
    }),
    DbModule,
    AuthModule,
    SubscriberModule,
    ProfileModule,
    AccountModule,
    AssetModule,
    NmsConfigModule,
    LifecycleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
