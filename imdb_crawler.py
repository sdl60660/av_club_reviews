import selenium
from selenium import webdriver

from bs4 import BeautifulSoup

import urllib.parse

import datetime
import json


def extract_episode_links(show_link, driver):
	out_data = []

	full_episode_link = 'https://www.imdb.com' + show_link.split('?')[0] + 'episodes'
	driver.get(full_episode_link)
	soup = BeautifulSoup(driver.page_source, 'html.parser')
	
	season_options = soup.find('select', attrs={'id': 'bySeason'}).findAll('option')
	seasons = [x.text.replace('\n', '').replace('\t', '').replace(' ', '') for x in season_options]

	for season in seasons:
		season_episode_list = full_episode_link + '?season={}'.format(season)
		driver.get(season_episode_list)
		soup = BeautifulSoup(driver.page_source, 'html.parser')

		episodes = soup.findAll('div', attrs={'class': 'list_item'})
		for episode in episodes:
			out_data.append({
				'imdb_episode_id': episode.find('strong').find('a')['href'].replace('/title/', '').split('?')[0].replace('/', ''),
				'episode_title': episode.find('strong').find('a').text,
				'season': int(season),
				'episode': int(episode.find('div', attrs={'class': 'hover-over-image'}).find('div').text.split(', ')[-1].replace('Ep', ''))
			})

	return out_data


chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--headless')

# driver_pool = [webdriver.Chrome(chrome_options=chrome_options) for _ in range(THREADS)]
driver = webdriver.Chrome(chrome_options=chrome_options)
out_data = {}

with open('data/review_data.json', 'r') as f:
	review_data = json.load(f)['data']

for show_name, show_data in list(review_data.items()):
	try:

		show_url_encoded = urllib.parse.quote(show_name.lower().split(' (')[0])
		driver.get('https://www.imdb.com/find?q={}&s=tt&ttype=tv&exact=true&ref_=fn_tt_ex'.format(show_url_encoded))

		soup = BeautifulSoup(driver.page_source, 'html.parser')

		tv_check = soup.findAll('td', attrs={'class': 'result_text'})[0].text
		text = soup.findAll('td', attrs={'class': 'result_text'})[0].find('a').text
		link = soup.findAll('td', attrs={'class': 'result_text'})[0].find('a')['href']

		if 'TV' in tv_check and 'TV Movie' not in tv_check and text.replace(':', '').lower() == show_name.split(' (')[0].replace(':', '').lower():
			imdb_data = extract_episode_links(link, driver)
			print(imdb_data)

			for av_episode in show_data:
				av_episode['imdb_show_id'] = link.split('?')[0].replace('/title', '').replace('/', '')

				for imdb_episode in imdb_data:
					if av_episode['episode_title'].strip('"').strip(' ').lower() == imdb_episode['episode_title'].strip(' ').lower() or \
					 (av_episode['season'] == imdb_episode['season'] and av_episode['episode'] == imdb_episode['episode']):
						av_episode['imdb_episode_id'] = imdb_episode['imdb_episode_id']

	except:
		print('ERROR:', show_name)



with open('data/enriched_av_data.json', 'w') as f:
	json.dump(review_data, f)



