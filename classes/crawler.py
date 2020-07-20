import selenium
from selenium import webdriver

class Crawler():

	def __init__(self, headless):
		chrome_options = webdriver.ChromeOptions()
		chrome_options.add_argument('--no-sandbox')
		if headless:
			chrome_options.add_argument('--headless')
		self.driver = webdriver.Chrome(chrome_options=chrome_options)

	def get(self, site):
		self.driver.get(site)