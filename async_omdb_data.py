import json
import requests
import time
import math

import asyncio
import aiohttp

import urllib.parse


start = time.time()
API_KEY = "3a976421"


def page_generator(start, stop):
    for page in range(start, stop+1):
        yield page


async def fetch(session, url):
    async with session.get(url) as r:
    	try:
    		return await r.json()
    	except:
    		print(r)
    		return None


async def get_records(module, page_num):
    more_records = True

    async with aiohttp.ClientSession() as session:
        url = 'https://www.zohoapis.com/crm/v2/{}?page={}&per_page=200&fields=First_Name,Last_Name,Cohort_Location_Picklist_New,Course_Selection_Picklist_New,Stakeholder_Type,LinkedIn,Name,Graduation_Date'.format(module, page_num)
        data = await fetch(session, url)
        print('RESPONSE COUNT: ' + str(page_num))
        return {**process_data(data), **{'page_num': page_num}}


async def search_for_show(show_title):
	formatted_show_name = urllib.parse.quote(show_title)
	url = "http://www.omdbapi.com/?s={}&page=1&type=series&apikey={}".format(formatted_show_name, API_KEY)

	async with aiohttp.ClientSession() as session:
		data = await fetch(session, url)
		print(data)


async def search_for_episode(episode_title):
	formatted_episode_name = urllib.parse.quote(episode_title.strip('"'))
	url = "http://www.omdbapi.com/?s={}&page=1&type=episode&apikey={}".format(formatted_episode_name, API_KEY)

	async with aiohttp.ClientSession() as session:
		return await fetch(session, url)


async def find_episode_by_id(imdb_episode_id):
	url = "http://www.omdbapi.com/?i={}&apikey={}".format(imdb_episode_id, API_KEY)

	async with aiohttp.ClientSession() as session:
		return await fetch(session, url)


async def find_show_by_id(show_id):
	url = "http://www.omdbapi.com/?i={}&apikey={}".format(show_id, API_KEY)

	async with aiohttp.ClientSession() as session:
		return await fetch(session, url)


with open('data/enriched_av_data.json', 'r') as f:
	data = json.load(f)

# http://www.omdbapi.com/?i=123&type=series OR type=episode
# http://www.omdbapi.com/?t=Breaking+Bad&apikey={}
# http://www.omdbapi.com/?s=Breaking+Bad&page=1
# http://www.omdbapi.com/?i=123

async def get_show_data(show_name, episodes):
	# print(show_name)
	show_data = {}

	if len(episodes) == 0:
		pass

	else:
		if 'imdb_show_id' in episodes[0].keys():
			show_id = episodes[0]['imdb_show_id']
			show_data['omdb_data'] = await find_show_by_id(show_id)
		else:
			# No IMDB ID for show
			show_data['omdb_data'] = {}
			await search_for_show(show_name)

		for episode in episodes:
			if 'imdb_episode_id' in episode.keys():
				episode['omdb_data'] = await find_episode_by_id(episode['imdb_episode_id'])

	show_data['episodes'] = episodes
	show_data['show_name'] = show_name
	return show_data


async def main():

	out_data = {}

	num_processes = 75

	iteratable_data = list(data.items())
	base_shows = len(iteratable_data)
	show_range = page_generator(1, base_shows)
	num_chunks = math.ceil(base_shows/num_processes)

	for chunk in range(num_chunks):
		tasks = []

		for process_num in range(num_processes):
			try:
				show_num = next(show_range)
				data_index = (chunk*num_processes) + process_num
				request = loop.create_task(get_show_data(iteratable_data[data_index][0], iteratable_data[data_index][1]))
				tasks.append(request)
			except StopIteration:
				pass

		await asyncio.wait(tasks)

		for task in tasks:
			print(task.result()['show_name'])
			out_data[task.result()['show_name']] = task.result()
			print(len(list(out_data.keys())))


	with open('data/full_data.json', 'w') as f:
		json.dump(out_data, f)
		

if __name__ == "__main__":

    try:
	    loop = asyncio.get_event_loop()
	    loop.run_until_complete(main())
    except:
        print('error')
    finally:
	    loop.close()

    print("%.2f" % (time.time() - start))
