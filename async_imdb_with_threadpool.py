from crawler import Crawler

from concurrent.futures.thread import ThreadPoolExecutor

from bs4 import BeautifulSoup
import urllib.parse

import datetime
import time
import json

from utils import page_generator

start = time.time()

def extract_episode_links(show_link, driver):
	out_data = []

	full_episode_link = 'https://www.imdb.com' + show_link.split('?')[0] + 'episodes'
	driver.get(full_episode_link)
	soup = BeautifulSoup(driver.driver.page_source, 'html.parser')
	
	season_options = soup.find('select', attrs={'id': 'bySeason'}).findAll('option')
	seasons = [x.text.replace('\n', '').replace('\t', '').replace(' ', '') for x in season_options]

	for season in seasons:
		season_episode_list = full_episode_link + '?season={}'.format(season)
		driver.get(season_episode_list)
		soup = BeautifulSoup(driver.driver.page_source, 'html.parser')

		episodes = soup.findAll('div', attrs={'class': 'list_item'})
		for episode in episodes:
			out_data.append({
				'imdb_episode_id': episode.find('strong').find('a')['href'].replace('/title/', '').split('?')[0].replace('/', ''),
				'episode_title': episode.find('strong').find('a').text,
				'season': int(season),
				'episode': int(episode.find('div', attrs={'class': 'hover-over-image'}).find('div').text.split(', ')[-1].replace('Ep', ''))
			})

	return out_data


def get_show_data(show_name, show_data, driver):
	show_url_encoded = urllib.parse.quote(show_name.lower().split(' (')[0])
	driver.get('https://www.imdb.com/find?q={}&s=tt&ttype=tv&exact=true&ref_=fn_tt_ex'.format(show_url_encoded))

	soup = BeautifulSoup(driver.driver.page_source, 'html.parser')

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

	return show_data


def show_data_wrapper(show_name, show_data, driver):
	# try:
	show_data = get_show_data(show_name, show_data, driver)
	return {
			'show_name': show_name,
			'show_data': show_data
			}
	# except:
	# 	print('ERROR:', show_name)
	# 	return {
	# 			'show_name': show_name,
	# 			'show_data': show_data
	# 			}


def main():
	with open('data/review_data.json', 'r') as f:
		review_data = json.load(f)['data']

	out_data = {}

	num_processes = 4

	driver_pool = [Crawler(headless=True) for _ in range(num_processes)]
	executor = ThreadPoolExecutor(max_workers=num_processes)

	iteratable_data = list(review_data.items())

	futures = []
	with ThreadPoolExecutor(max_workers=num_processes) as ex:
	    for i, item in enumerate(iteratable_data):
	        futures.append(ex.submit(show_data_wrapper, item[0], item[1], driver_pool[i%num_processes]))

	for future in futures:
		print(future.result()['show_name'])
		out_data[future.result()['show_name']] = future.result()['show_data']


	with open('data/enriched_av_data.json', 'w') as f:
		json.dump(out_data, f)


if __name__ == "__main__":
	main()
	print("%.2f" % (time.time() - start))



