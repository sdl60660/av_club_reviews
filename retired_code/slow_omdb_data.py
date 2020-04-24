import json
import requests
import asyncio
import aiohttp

import urllib.parse


def search_for_show(show_title):
	formatted_show_name = urllib.parse.quote(show_title)
	r = requests.get("http://www.omdbapi.com/?s={}&page=1&type=series&apikey={}".format(formatted_show_name, API_KEY))
	print(r.json())
	# return r.json()	


def search_for_episode(episode_title):
	formatted_episode_name = urllib.parse.quote(episode_title.strip('"'))
	r = requests.get("http://www.omdbapi.com/?s={}&page=1&type=episode&apikey={}".format(formatted_episode_name, API_KEY))
	return r.json()


def find_episode_by_id(imdb_episode_id):
	r = requests.get("http://www.omdbapi.com/?i={}&apikey={}".format(imdb_episode_id, API_KEY))
	return r.json()


def find_show_by_id(show_id):
	r = requests.get("http://www.omdbapi.com/?i={}&apikey={}".format(show_id, API_KEY))
	return r.json()


API_KEY = "3a976421"

with open('data/enriched_av_data.json', 'r') as f:
	data = json.load(f)

# http://www.omdbapi.com/?i=123&type=series OR type=episode
# http://www.omdbapi.com/?t=Breaking+Bad&apikey={}
# http://www.omdbapi.com/?s=Breaking+Bad&page=1
# http://www.omdbapi.com/?i=123

out_data = {}

for show, episodes in list(data.items()):
	print(show)
	show_data = {}

	if len(episodes) == 0:
		continue

	if 'imdb_show_id' in episodes[0].keys():
		show_id = episodes[0]['imdb_show_id']
		show_data['omdb_data'] = find_show_by_id(show_id)
	else:
		# No IMDB ID for show
		show_data['omdb_data'] = {}
		search_for_show(show)

	for episode in episodes:
		if 'imdb_episode_id' in episode.keys():
			episode['omdb_data'] = find_episode_by_id(episode['imdb_episode_id'])

	show_data['episodes'] = episodes
	out_data[show] = show_data
		
		
with open('data/full_data.json', 'w') as f:
	json.dump(out_data, f)
