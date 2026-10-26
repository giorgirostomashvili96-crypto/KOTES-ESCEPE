extends Node2D

@export var ground_y: float = 540.0

var current_level_index: int = 0
var current_speed: float = 300.0
var base_speed: float = 300.0
var score: int = 0
var coins: int = 0
var distance: float = 0.0
var multiplier: int = 1
var fever_timer: float = 0.0
var fever_streak: int = 0

var next_obstacle_dist: float = 450.0
var next_collectible_dist: float = 380.0

@onready var player: Player = $Player
@onready var chaser: Chaser = $Chaser
@onready var hud: HUD = $HUD

var obstacle_scene := preload("res://scenes/Obstacle.tscn")
var flying_toilet_scene := preload("res://scenes/FlyingToilet.tscn")
var collectible_scene := preload("res://scenes/Collectible.tscn")

var is_game_over: bool = false
var gdata: GameDataManager = null

func _ready() -> void:
	gdata = GameDataManager.new()
	gdata.load_data()
	coins = gdata.coins

	if player:
		player.selected_skin = gdata.selected_skin
		player.apply_skin_perks()
		player.hit_obstacle.connect(_on_player_hit_obstacle)
		player.collected_item.connect(_on_player_collected_item)
		player.near_miss_triggered.connect(_on_near_miss)

	if chaser:
		# Halloween skin starts with +40px head start!
		if gdata.selected_skin == "halloween":
			chaser.follow_distance = 260.0
		else:
			chaser.follow_distance = 220.0

	if hud:
		hud.restart_requested.connect(restart_game)
		hud.trap_pressed.connect(drop_banana_trap)
		hud.boost_pressed.connect(throw_distraction_bone)

	load_level(0)

func load_level(idx: int) -> void:
	current_level_index = clamp(idx, 0, gdata.levels_catalog.size() - 1)
	var lcfg = gdata.levels_catalog[current_level_index]
	base_speed = lcfg["speed"]
	current_speed = base_speed

func _process(dt: float) -> void:
	if is_game_over:
		return

	# Handle level progression by distance
	if current_level_index < gdata.levels_catalog.size() - 1:
		var target_dist: float = gdata.levels_catalog[current_level_index]["target_dist"]
		if distance >= target_dist:
			load_level(current_level_index + 1)
			if hud:
				hud.show_level_up(gdata.levels_catalog[current_level_index]["name_ka"])

	# Fever mode handling
	if fever_timer > 0.0:
		fever_timer -= dt
		current_speed = base_speed * 1.35
		multiplier = 3
	else:
		current_speed = base_speed
		multiplier = 1

	var shift = current_speed * dt
	distance += shift * 0.1
	score += int(shift * 0.2 * multiplier)

	# Update Spawners
	next_obstacle_dist -= shift
	if next_obstacle_dist <= 0:
		spawn_obstacle()
		next_obstacle_dist = randf_range(480.0, 780.0)

	next_collectible_dist -= shift
	if next_collectible_dist <= 0:
		spawn_collectibles()
		next_collectible_dist = randf_range(380.0, 600.0)

	# Move all spawned children in World
	for child in get_tree().get_nodes_in_group("world_objects"):
		child.position.x -= shift
		if child.position.x < -120:
			child.queue_free()

	# Magnet attraction physics: attract nearby coins within 75px
	if player and (player.has_magnet or fever_timer > 0.0):
		for item in get_tree().get_nodes_in_group("collectibles"):
			if is_instance_valid(item):
				var dist_to_player = player.global_position.distance_to(item.global_position)
				if dist_to_player < 80.0:
					item.global_position = item.global_position.move_toward(player.global_position, dt * 500.0)

	# Chaser pursuit positioning
	if chaser and player:
		chaser.position.y = player.position.y
		chaser.position.x = lerp(chaser.position.x, player.position.x - chaser.follow_distance, dt * 2.0)
		var threat_dist = player.position.x - chaser.position.x
		if threat_dist <= 25.0 and not chaser.is_slipped:
			trigger_game_over()

	# Update HUD
	if hud:
		var fever_pct = (fever_timer / 6.5) * 100.0 if fever_timer > 0 else (float(fever_streak) / 6.0) * 100.0
		var threat_dist = player.position.x - chaser.position.x if (player and chaser) else 220.0
		var level_name: String = gdata.levels_catalog[current_level_index]["name_ka"]
		hud.update_stats(score, coins, int(distance), multiplier, fever_pct, threat_dist, level_name)

func spawn_obstacle() -> void:
	var roll = randf()
	if roll < 0.32:
		# Spawn Flying Jet Toilet (Duck / Slide / Somersault under!)
		var toilet = flying_toilet_scene.instantiate()
		toilet.position = Vector2(1360, ground_y - 75)
		toilet.add_to_group("world_objects")
		add_child(toilet)
	else:
		var obs = obstacle_scene.instantiate() as Obstacle
		obs.position = Vector2(1360, ground_y - 24)
		obs.kind = randi() % 5 as Obstacle.ObstacleKind
		obs.add_to_group("world_objects")
		add_child(obs)

func spawn_collectibles() -> void:
	# 50% reduced batch (as requested): 2 to 3 rolls in gentle arc
	var count = randi_range(2, 3)
	for i in range(count):
		var item = collectible_scene.instantiate() as Collectible
		var arc_y = sin(float(i) / max(1, count - 1) * PI) * 55.0
		item.position = Vector2(1360 + i * 58, ground_y - 60 - arc_y)
		item.type = Collectible.CollectibleType.COIN
		item.value = 20
		item.add_to_group("world_objects")
		item.add_to_group("collectibles")
		add_child(item)

func drop_banana_trap() -> void:
	if chaser:
		chaser.trip_banana()
		if hud:
			hud.show_toast("🍌 ბანანის ხაფანგი! მდევარი გასრიალდა!")

func throw_distraction_bone() -> void:
	if chaser:
		chaser.distract_with_bone()
		if hud:
			hud.show_toast("🦴 ძვალი გადააგდე! მდევარი შეჩერდა!")

func _on_player_hit_obstacle(obs: Node2D) -> void:
	if player.invincible_timer > 0.0:
		return

	# If player has protective shield, shield absorbs hit!
	if player.has_shield:
		player.has_shield = false
		player.invincible_timer = 1.5
		if hud:
			hud.show_toast("🛡️ ფარმა დარტყმა აისხლიტა!")
		return

	player.stumble_timer = 0.9
	player.invincible_timer = 1.2
	fever_streak = 0
	fever_timer = 0.0

	if chaser:
		chaser.position.x = min(player.position.x - 30.0, chaser.position.x + 75.0)
		var threat_dist = player.position.x - chaser.position.x
		if threat_dist <= 25.0:
			trigger_game_over()

func _on_near_miss(pos: Vector2) -> void:
	score += 150 * multiplier
	if hud:
		hud.show_toast("⚡ NEAR MISS! +150")

func _on_player_collected_item(item: Collectible) -> void:
	if item.type == Collectible.CollectibleType.COIN:
		# Skin coin bonuses:
		var earned = 2
		if player.selected_skin == "vip":
			earned = 4 # x2 VIP Gold Multiplier!
		elif player.selected_skin == "new_year":
			earned = 3 # +50% holiday coins!

		coins += earned
		gdata.coins = coins
		gdata.save_data()

		fever_streak += 1
		if fever_streak >= 6 and fever_timer <= 0.0:
			fever_timer = 6.5
			fever_streak = 0
			if hud:
				hud.show_toast("🧻 სუპერ რეჟიმი! x3 🧻")
	elif item.type == Collectible.CollectibleType.MAGNET:
		player.magnet_timer = 12.0
		player.has_magnet = true
		if hud:
			hud.show_toast("🧲 სუპერ მაგნიტი!")
	elif item.type == Collectible.CollectibleType.SHIELD:
		player.has_shield = true
		if hud:
			hud.show_toast("🛡️ დამცავი ფარი!")
	elif item.type == Collectible.CollectibleType.SPEED:
		player.speed_boost_timer = 8.0
		if hud:
			hud.show_toast("⚡ კოტეს ენერგეტიკი!")
	elif item.type == Collectible.CollectibleType.BONE:
		throw_distraction_bone()

func trigger_game_over() -> void:
	is_game_over = true
	if score > gdata.high_score:
		gdata.high_score = score
	if int(distance) > gdata.high_distance:
		gdata.high_distance = int(distance)
	gdata.coins = coins
	gdata.save_data()

	if hud:
		hud.show_game_over(score, int(distance), coins)

func restart_game() -> void:
	get_tree().reload_current_scene()
