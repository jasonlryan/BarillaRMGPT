import csv
from collections import defaultdict

def compile_data(file_path):
    # Initialize a nested defaultdict
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))

    # Open and read the CSV file
    with open(file_path, 'r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)

        # Iterate through each row in the CSV
        for row in reader:
            touchpoint = row['Touchpoint']
            phase = row['Phase']
            channel = row['Channel']
            all_avge_index = float(row['all_avge_index']) if row['all_avge_index'] else 0.0

            # Organize data for each country
            for country_prefix in ['aus_', 'fr_', 'au_', 'de_', 'gr_', 'ch_', 'us_']:

                country = country_prefix[:-1].capitalize()  # Convert 'fr_' to 'Fr', etc.
                #max_norm_resp = row[country_prefix + 'max_norm_resp%']
                # max_norm_imp = row[country_prefix + 'max_nor_imp_avg']
                index = float(row[country_prefix + 'index']) if row[country_prefix + 'index'] else 0.0
                dfm_by_chnl = float(row[country_prefix + 'dfm_by_chnl']) if row[country_prefix + 'dfm_by_chnl'] else 0.0

                # Store the values in the nested dictionary
                data[country][phase][touchpoint] = {
                    'Channel': channel,
                    'index': index,
                    'dfm_by_chnl': dfm_by_chnl,
                    'all_avge_index': all_avge_index
                }

    return data

def write_to_txt(data, output_path):
    with open(output_path, 'w') as file:
        for country, phases in data.items():
            file.write(f"{country}:\n")
            for phase, touchpoints in phases.items():
                file.write(f"  {phase}:\n")
                for touchpoint, metrics in touchpoints.items():
                    metrics_str = ', '.join(f"'{k}': '{v}'" for k, v in metrics.items())
                    file.write(f"    {touchpoint}: {{{metrics_str}}}\n")
            file.write("\n")

# Example usage:
file_path = 'data/pasta_aus_fr_au_de_gr_ch_us.csv'  # Path to your CSV file
output_path = 'output/pasta_data.txt'  # Path to save the .txt file

compiled_data = compile_data(file_path )
write_to_txt(compiled_data, output_path)

print(f"Structured data has been written to {output_path}")
