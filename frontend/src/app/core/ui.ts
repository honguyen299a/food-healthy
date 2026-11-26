export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const message = (error:any) => error?.error?.message instanceof Array ? error.error.message.join(', ') : error?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
export const num = (n:any) => Math.round(Number(n || 0));
export const mealNames:Record<string,string> = {BREAKFAST:'Bữa sáng',LUNCH:'Bữa trưa',DINNER:'Bữa tối',SNACK:'Bữa phụ'};
