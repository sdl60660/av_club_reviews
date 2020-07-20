from psycopg2 import pool
from psycopg2.extras import RealDictCursor


class Database:
	_connection_pool = None

	@classmethod
	def initialize(cls, **kwargs):
		cls._connection_pool = pool.SimpleConnectionPool(1,
														 20,
														 **kwargs)
	@classmethod
	def get_connection(cls):
		return cls._connection_pool.getconn()

	@classmethod
	def return_connection(cls, connection):
		cls._connection_pool.putconn(connection)

	@classmethod
	def close_all_connections(cls):
		cls._connection_pool.closeall()




class CursorFromConnectionFromPool:
	def __init__(self, dict_cursor=False):
		self.connection = None
		self.cursor = None
		self.dict_cursor = dict_cursor

	def __enter__(self):
		self.connection = Database.get_connection()
		if self.dict_cursor:
			self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
		else:
			self.cursor = self.connection.cursor()
		return self.cursor

	def __exit__(self, exc_type, exc_val, exc_tb):
		if exc_val is not None:
			self.connection.rollback()
		else:
			self.cursor.close()
			self.connection.commit()
		Database.return_connection(self.connection)


# def connect():
	# return psycopg2.connect(user='postgres', password='rooster7123!', database='learning', host='localhost')
