import json

grade_translation_dict = {
	'A+': 11,
	'A': 11,
	'A-': 10,
	'B+': 9,
	'B': 8,
	'B-': 7,
	'C+': 6,
	'C': 5,
	'C-': 4,
	'D+': 3,
	'D': 2,
	'D-': 1,
	'F': 0
}


with open('data/full_data.json', 'r') as f:
	full_data = json.load(f)


reviewers = {}

for show, show_data in full_data.items():
	show_data['episodes'] = [x for x in show_data['episodes'] if x['grade'] and len(x['grade']) <= 2]

	season_nums = set(map(lambda x: x['season'], show_data['episodes']))
	seasons = [{'season': x, 'num_episodes': len([y for y in show_data['episodes'] if y['season']==x]), 'episodes': [y for y in show_data['episodes'] if y['season']==x]} for x in season_nums]
	
	for season in seasons:

		unique_reviewers = list(set([x['reviewer']['reviewer_name'] for x in season['episodes']]))
		num_reviewers = len(unique_reviewers)
		
		if num_reviewers == 1:
			print('here')
		else:
			average_season_score = 1.0*sum([grade_translation_dict[x['grade']] for x in season['episodes']])/season['num_episodes']
		
			for reviewer in unique_reviewers:
				reviewed_eps = [x for x in season['episodes'] if x['reviewer']['reviewer_name'] == reviewer]
				average_reviewer_score = 1.0*sum([grade_translation_dict[x['grade']] for x in reviewed_eps])/len(reviewed_eps)

				reviewers[reviewer] = reviewers.get(reviewer, []) + [(average_reviewer_score - average_season_score)]

print(reviewers)