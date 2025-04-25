export enum EQueryTypes {
  select = 'SELECT',
  insert = 'INSERT',
  update = 'UPDATE',
  delete = 'DELETE',
  alter = 'ALTER',
  drop = 'DROP',
  create = 'CREATED',
  truncate = 'TRUNCATE',
  unknown = 'UNKNOWN',
}

export function getQueryType(query: string): EQueryTypes {
  if (!query) return EQueryTypes.unknown;

  const trimmedQuery = query.trim().toUpperCase();
  const firstWord = trimmedQuery.split(/\s+/)[0]; // Get first word like SELECT, UPDATE, etc.

  switch (firstWord) {
    case 'SELECT':
    case 'WITH': // CTE queries
      return EQueryTypes.select;
    case 'INSERT':
      return EQueryTypes.insert;
    case 'UPDATE':
      return EQueryTypes.update;
    case 'DELETE':
      return EQueryTypes.delete;
    case 'ALTER':
      return EQueryTypes.alter;
    case 'DROP':
      return EQueryTypes.drop;
    case 'CREATE':
      return EQueryTypes.create;
    case 'TRUNCATE':
      return EQueryTypes.truncate;
    default:
      return EQueryTypes.unknown;
  }
}
