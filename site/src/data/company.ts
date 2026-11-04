/* Сведения о компании со статусом проверки.
   site — взято с aixtex.ru или из концепции A, показывается, но требует подтверждения;
   unverified — заявление, которое публикуется только после подтверждения;
   confirmed — подтверждено заказчиком.
   В режиме согласования unverified показывается с пометкой, в публичной версии скрыто. */

export type Status = 'confirmed' | 'site' | 'unverified';

export interface Fact {
  label: string;
  value: string;
  status: Status;
  source: string;
}

export const COMPANY = {
  brand: 'АИТЕХ',
  legalName: 'ООО «Агентство интеллектуальных технологий»',
  descriptor: 'Агентство интеллектуальных технологий',
  phone: { href: 'tel:+79154267807', text: '+7 (915) 426-78-07', status: 'site' as Status },
  email: { href: 'mailto:contact@aixtex.ru', text: 'contact@aixtex.ru', status: 'site' as Status },
};

export const REQUISITES: Fact[] = [
  { label: 'Компания', value: 'ООО «Агентство интеллектуальных технологий»', status: 'site', source: 'aixtex.ru' },
  { label: 'ИНН', value: '9707049984', status: 'site', source: 'aixtex.ru' },
  { label: 'ОГРН', value: '1257700352667', status: 'site', source: 'aixtex.ru' },
  { label: 'Адрес', value: '127051, Москва, 2-й Колобовский пер., 12, кв. 12а', status: 'site', source: 'aixtex.ru' },
  { label: 'ОКВЭД', value: '62.01', status: 'site', source: 'aixtex.ru' },
];

/* Паспорт продукта из концепции A: строки идут в карточку блока «Как работаем» */
export const PRODUCT_FACTS: Fact[] = [
  { label: 'Запись', value: '№ 32900 от 31.03.2026', status: 'unverified', source: 'концепция A, нужна выписка из реестра' },
  { label: 'Поставка', value: 'Интернет-сервис или размещение в вашей инфраструктуре', status: 'unverified', source: 'концепция A' },
  { label: 'Стек', value: 'Python, JavaScript, TypeScript, PostgreSQL 15', status: 'unverified', source: 'концепция A' },
  { label: 'Права', value: 'Исключительные права у ООО «АИТЕХ»', status: 'unverified', source: 'концепция A' },
];

export const NOTICE = {
  text: 'ООО «АИТЕХ» не проводит набор сотрудников и не рассылает предложения о работе через мессенджеры. Официальные контакты указаны на этом сайте.',
  status: 'site' as Status,
};

/* Что выводить: в публичной версии неподтверждённые заявления скрываются */
export const visibleFacts = (facts: Fact[], review: boolean) =>
  facts.filter((f) => f.status !== 'unverified' || review);
