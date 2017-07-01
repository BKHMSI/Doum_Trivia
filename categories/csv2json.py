import csv
import json

csvfile = open('history.csv', 'r')
jsonfile = open('history.json', 'w')

fieldnames = ("question","answer","correction","difficulty")
reader = csv.DictReader(csvfile, fieldnames)
jsonfile.write("[")
for row in reader:
    json.dump(row, jsonfile)
    jsonfile.write(',\n')
jsonfile.write("]")