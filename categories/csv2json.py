import csv
import json

csvfile = open('literature.csv', 'r')
jsonfile = open('literature.json', 'w')

fieldnames = ("question","answer","correction","difficulty")
reader = csv.DictReader(csvfile, fieldnames)
jsonfile.write("[")
for row in reader:
    json.dump(row, jsonfile)
    jsonfile.write(',\n')
jsonfile.write("]")