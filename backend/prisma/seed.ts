import 'dotenv/config';
import { PrismaClient, Meal } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const db = new PrismaClient();
const DEMO_EMAIL = 'demo@healthydaily.vn';
const DEMO_PASSWORD = 'Demo@12345';
const isoDate = (offset = 0) => { const date = new Date(); date.setUTCDate(date.getUTCDate() + offset); return new Date(`${date.toISOString().slice(0,10)}T00:00:00.000Z`); };

async function main() {
  await require('../scripts/import-food-catalog.cjs').importFoodCatalog(db);

  for (const [email,role,password] of [['user@example.com','USER',process.env.SEED_USER_PASSWORD],['admin@example.com','ADMIN',process.env.SEED_ADMIN_PASSWORD]] as const) {
    if (!password) continue;
    await db.user.upsert({where:{email},update:{},create:{email,role,passwordHash:await bcrypt.hash(password,12),onboardingCompleted:true}});
  }

  const demo = await db.user.upsert({
    where:{email:DEMO_EMAIL},
    update:{passwordHash:await bcrypt.hash(DEMO_PASSWORD,12),usageMode:'PERSONALIZED',onboardingCompleted:true},
    create:{email:DEMO_EMAIL,passwordHash:await bcrypt.hash(DEMO_PASSWORD,12),usageMode:'PERSONALIZED',onboardingCompleted:true}
  });
  await db.userProfile.upsert({where:{userId:demo.id},update:{name:'Nguyễn Minh Anh',age:28,gender:'FEMALE',heightCm:165,weightKg:60,targetWeightKg:56,activity:'MODERATE',goal:'MAINTAIN',healthConditions:[],allergies:['đậu phộng'],dietaryPreferences:[],mealsPerDay:3},create:{userId:demo.id,name:'Nguyễn Minh Anh',age:28,gender:'FEMALE',heightCm:165,weightKg:60,targetWeightKg:56,activity:'MODERATE',goal:'MAINTAIN',healthConditions:[],allergies:['đậu phộng'],dietaryPreferences:[],mealsPerDay:3}});

  const foods = await db.food.findMany({where:{ownerId:null,name:{in:['Yến mạch','Sữa chua Hy Lạp','Ức gà luộc','Gạo lứt chín','Bông cải xanh','Cá hồi']}}});
  const food = (name:string) => { const found=foods.find(x=>x.name===name); if(!found)throw new Error(`Không tìm thấy ${name}`); return found; };
  const plan = await db.mealPlan.upsert({where:{userId_date:{userId:demo.id,date:isoDate()}},update:{},create:{userId:demo.id,date:isoDate()}});
  await db.mealPlanItem.deleteMany({where:{planId:plan.id}});
  await db.mealPlanItem.createMany({data:[
    {planId:plan.id,foodId:food('Yến mạch').id,meal:Meal.BREAKFAST,grams:45},{planId:plan.id,foodId:food('Sữa chua Hy Lạp').id,meal:Meal.BREAKFAST,grams:120},
    {planId:plan.id,foodId:food('Ức gà luộc').id,meal:Meal.LUNCH,grams:150},{planId:plan.id,foodId:food('Gạo lứt chín').id,meal:Meal.LUNCH,grams:180},{planId:plan.id,foodId:food('Bông cải xanh').id,meal:Meal.LUNCH,grams:150},
    {planId:plan.id,foodId:food('Cá hồi').id,meal:Meal.DINNER,grams:140}
  ]});
  const log = await db.foodLog.upsert({where:{userId_date:{userId:demo.id,date:isoDate()}},update:{},create:{userId:demo.id,date:isoDate()}});
  await db.foodLogItem.deleteMany({where:{logId:log.id}});
  await db.foodLogItem.createMany({data:[{logId:log.id,foodId:food('Yến mạch').id,meal:Meal.BREAKFAST,grams:45},{logId:log.id,foodId:food('Sữa chua Hy Lạp').id,meal:Meal.BREAKFAST,grams:120},{logId:log.id,foodId:food('Ức gà luộc').id,meal:Meal.LUNCH,grams:150},{logId:log.id,foodId:food('Gạo lứt chín').id,meal:Meal.LUNCH,grams:180}]});
  for (const [offset,weight] of [[-21,61.2],[-14,60.8],[-7,60.3],[0,60]] as const) await db.weightLog.upsert({where:{userId_date:{userId:demo.id,date:isoDate(offset)}},update:{weightKg:weight},create:{userId:demo.id,date:isoDate(offset),weightKg:weight}});
  console.log(`Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect());
