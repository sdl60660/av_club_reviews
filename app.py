from flask import Flask, render_template
from database import Database, CursorFromConnectionFromPool


Database.initialize(host="localhost", port=5433, database="tv_reviews", user="samlearner", password="postgres")
# con = Database.get_connection()

"""with CursorFromConnectionFromPool() as cur:
	cur.execute('SELECT * FROM shows LIMIT 5')
	print(cur.fetchone())"""


app = Flask(__name__)
app.secret_key = '1234'

@app.route('/')
def homepage():
	return render_template('index.html')








if __name__ == "__main__":
    app.run(port=5453, debug=True)