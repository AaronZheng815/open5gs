import { Inject, Injectable } from '@nestjs/common';
import type { Model } from 'mongoose';
import { ProfileModel, type ProfileDoc } from './profile.schema';

const PROFILE_MODEL = 'Profile';

@Injectable()
export class ProfileRepository {
  constructor(@Inject(PROFILE_MODEL) private readonly model: Model<ProfileDoc> = ProfileModel) {}

  findAll(): Promise<ProfileDoc[]> {
    return this.model.find().lean().exec();
  }

  findOneByTitle(title: string): Promise<ProfileDoc | null> {
    return this.model.findOne({ title }).lean().exec();
  }

  create(doc: Partial<ProfileDoc>): Promise<ProfileDoc> {
    return this.model.create(doc).then((saved) => saved.toObject() as ProfileDoc);
  }

  updateByTitle(title: string, update: Partial<ProfileDoc>): Promise<ProfileDoc | null> {
    return this.model.findOneAndUpdate({ title }, update, { new: true }).lean().exec();
  }

  deleteByTitle(title: string): Promise<unknown> {
    return this.model.deleteOne({ title }).exec();
  }
}
