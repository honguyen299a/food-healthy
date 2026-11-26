import 'dotenv/config';
import { PrismaClient, Meal } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const db = new PrismaClient();
const DEMO_EMAIL = 'demo@healthydaily.vn';
const DEMO_PASSWORD = 'Demo@12345';
const isoDate = (offset = 0) => { const date = new Date(); date.setUTCDate(date.getUTCDate() + offset); return new Date(`${date.toISOString().slice(0,10)}T00:00:00.000Z`); };

async function main() {
  const groups: Record<string,[string,number,number,number,number][]> = {
    'Đạm lành mạnh': [['Ức gà luộc',165,31,0,3.6],['Cá hồi',208,20,0,13],['Trứng gà',155,13,1.1,11],['Đậu phụ',76,8,1.9,4.8]],
    'Ngũ cốc': [['Gạo lứt chín',111,2.6,23,0.9],['Yến mạch',389,16.9,66.3,6.9],['Bánh mì nguyên cám',247,13,41,4.2]],
    'Rau củ': [['Bông cải xanh',34,2.8,6.6,0.4],['Cà rốt',41,.9,9.6,.2],['Rau bina',23,2.9,3.6,.4]],
    'Trái cây': [['Chuối',89,1.1,22.8,.3],['Táo',52,.3,13.8,.2],['Cam',47,.9,11.8,.1]],
    'Sữa và hạt': [['Sữa chua Hy Lạp',97,9,3.9,5],['Hạnh nhân',579,21,22,50]]
  };
  for (const [name, foods] of Object.entries(groups)) {
    const category = await db.foodCategory.upsert({where:{name},update:{},create:{name}});
    for (const [foodName,calories,protein,carbs,fat] of foods) await db.food.upsert({where:{name:foodName},update:{categoryId:category.id,calories,protein,carbs,fat,isActive:true},create:{name:foodName,categoryId:category.id,calories,protein,carbs,fat}});
  }

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

  const foods = await db.food.findMany({where:{name:{in:['Yến mạch','Sữa chua Hy Lạp','Ức gà luộc','Gạo lứt chín','Bông cải xanh','Cá hồi']}}});
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
