import selenium
from selenium import webdriver

import requests
from bs4 import BeautifulSoup

import datetime
import json
import re
from pprint import pprint

class AVClubCrawler():

	def __init__(self):
		chrome_options = webdriver.ChromeOptions()
		chrome_options.add_argument('--no-sandbox')
		chrome_options.add_argument('--headless')
		self.driver = webdriver.Chrome(chrome_options=chrome_options)

	def get_site(self, site):
		self.driver.get(site)


def get_review_links(show):
	show_stub = show.replace(' &', '').replace('/','').replace('?', '').replace(' ', '-').lower()
	print(show, show_stub)

	all_article_links = []
	review_page_link = 'https://tv.avclub.com/'
	base_link = 'https://www.avclub.com/c/tv-review/' + show_stub
	link = base_link
	next_page = True

	while next_page:
		r = requests.get(link)
		soup = BeautifulSoup(r.text, 'html.parser')

		for article in soup.find('main').find_all('article'):
			links = article.find_all('a')
			all_article_links += [link['href'] for link in links if review_page_link in link['href'] and link['href'] != 'https://tv.avclub.com/c/tv-review']

		next_page = soup.find('a', attrs={'data-ga': '[["Story type page click","More stories click"]]'})
		if next_page:
			link = base_link + next_page['href']

	all_article_links = list(set(all_article_links))

	return all_article_links


def get_review_info(link, show):
	print(link)

	show_stub = show.replace(' &', '').replace('/','').replace('?', '').replace(' ', '-').lower()

	crawler.get_site(link)
	page_source = crawler.driver.page_source
	soup = BeautifulSoup(page_source, 'html.parser')


	# Top line reviewer/date info. Only available if Javascript for page can load
	try:
		date = str(datetime.datetime.strptime(soup.findAll("a", attrs={"class", "js_meta-time"})[0].text, '%m/%d/%y %I:%M%p'))
	except:
		date = soup.findAll("a", attrs={"class", "js_meta-time"})[0].text

	reviewer = [x for x in soup.findAll("a", attrs={"class", "js_link"}) if x.has_attr('data-ga') and '"Author click"' in x['data-ga']][1]
	reviewer_name = reviewer.text
	reviewer_link = reviewer['href']


	# Review box holds most episode and review information
	review_box = soup.find('section', attrs={'class': 'reviewbox-inset'})

	if not review_box:
		return {
		'show': show,
		'review_link': link,
		'date': date,
		'reviewer': {
			'reviewer_name': reviewer_name,
			'kinja_link': reviewer_link
			},
		'show_stub': show_stub,
		'season': None,
		'episode': None,
		'grade': None
	}
	
	episode_title = review_box['title']

	try:
		season_links = [x for x in review_box.find_all('a', attrs={'class', 'js_link'}) if '/c/tv-review/' in x['href'] and 'season' in x['href']]
		if len(season_links) > 0:
			season = int((season_links[0]['href']).split('/')[-1].split('-')[-1])
		elif review_box.find(text=re.compile(r"^Season ")) and 9 >= len(review_box.find(text=re.compile(r"^Season "))) >= 8:
			season = int(review_box.find(text=re.compile(r"^Season "))[7:])
		else:
			season = int(review_box.find(text="Season").parent.findNext('p').text)
	except:
		season = None

	try:
		episode = int(review_box.find(text="Episode").parent.findNext('p').text)
	except:
		episode = None

	grade = (review_box.findAll("span")[-1]).text

	return {
		'show': show,
		'review_link': link,
		'episode_title': episode_title,
		'season': season,
		'episode': episode,
		'grade': grade,
		'date': date,
		'reviewer': {
			'reviewer_name': reviewer_name,
			'kinja_link': reviewer_link
			},
		'show_stub': show_stub
	}


crawler = AVClubCrawler()
crawler.get_site('https://www.avclub.com/c/tv-review')

show_menu = crawler.driver.find_elements_by_xpath("//*[contains(text(), 'All Categories')]")[0]
show_menu.click()

shows = [_.text for _ in crawler.driver.find_elements_by_xpath("//ul//li[@role='option']//span") if _.text != 'All Categories']

# error_links = []
output_data = {'data': {}, 'meta': {'date_retrieved': str(datetime.datetime.now())}}

for show in shows:
	print(show)

	if show in output_data['data'].keys():
		continue
	
	review_links = list(set([x.replace("#replies", "") for x in get_review_links(show)]))
	episode_reviews = []

	for link in review_links:
		try:
			review_info = get_review_info(link, show)
			episode_reviews.append(review_info)

			pprint(review_info)
		except:
			error_links.append(link)

	output_data['data'][show] = episode_reviews
	
	with open('data/review_data.json', 'w') as f:
		json.dump(output_data, f)

# print('-----ERROR LINKS-----')
# for link in error_links:
# 	print(link)

# with open('error_links.txt', 'w') as f:
# 	f.writelines(error_links)


		