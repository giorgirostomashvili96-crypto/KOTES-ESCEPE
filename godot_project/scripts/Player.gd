extends CharacterBody2D
class_name Player

signal hit_obstacle(obs)
signal collected_item(item)
signal near_miss_triggered(pos)

@export var speed: float = 300.0
@export var jump_force: float = -620.0
@export var double_jump_force: float = -550.0
@export var gravity: float = 1450.0

@export var selected_skin: String = "classic"

var jump_count: int = 0
var max_jumps: int = 2
var is_sliding: bool = false
var slide_timer: float = 0.0
var slide_frame: int = 0
var slide_frame_timer: float = 0.0
var run_frame_timer: float = 0.0
var run_frame: int = 0
var invincible_timer: float = 0.0
var stumble_timer: float = 0.0

var has_shield: bool = false
var has_magnet: bool = false
var magnet_timer: float = 0.0
var speed_boost_timer: float = 0.0

@onready var collision_shape: CollisionShape2D = $CollisionShape2D

var base_shape_height: float = 90.0
var slide_shape_height: float = 40.0

func _ready() -> void:
	apply_skin_perks()

func apply_skin_perks() -> void:
	# Cyberpunk gets Triple Jump!
	if selected_skin == "cyberpunk":
		max_jumps = 3
	else:
		max_jumps = 2

	# Svaneti starts with protective mountain frost shield
	if selected_skin == "svaneti":
		has_shield = true

	# Summer gets initial speed sprint boost
	if selected_skin == "summer":
		speed_boost_timer = 12.0

	# Chokha starts with magnetic aura
	if selected_skin == "chokha":
		has_magnet = true
		magnet_timer = 18.0

func _physics_process(dt: float) -> void:
	# Invincibility & stumble
	if invincible_timer > 0.0:
		invincible_timer -= dt
		visible = int(invincible_timer * 20.0) % 2 == 0
	else:
		visible = true

	if stumble_timer > 0.0:
		stumble_timer -= dt

	# Power-up timers
	if magnet_timer > 0.0:
		magnet_timer -= dt
		has_magnet = true
	else:
		if selected_skin != "chokha":
			has_magnet = false

	if speed_boost_timer > 0.0:
		speed_boost_timer -= dt

	# Slide processing
	if is_sliding:
		slide_timer -= dt
		slide_frame_timer += dt * 8.5
		slide_frame = int(slide_frame_timer) % 6
		if slide_timer <= 0.0:
			end_slide()

	# Gravity
	if not is_on_floor():
		velocity.y += gravity * dt
	else:
		if velocity.y > 0:
			velocity.y = 0
		jump_count = 0
		run_frame_timer += dt * (speed / 260.0) * 12.0
		run_frame = int(run_frame_timer) % 6

	# Handle controls (Keyboard & Touch)
	if Input.is_action_just_pressed("jump"):
		try_jump()
	elif Input.is_action_just_released("jump"):
		cut_jump()

	if Input.is_action_just_pressed("slide"):
		start_slide()

	move_and_slide()
	queue_redraw()

func try_jump() -> void:
	if is_sliding:
		end_slide()

	if is_on_floor() or jump_count < max_jumps:
		jump_count += 1
		velocity.y = jump_force if jump_count == 1 else double_jump_force

func cut_jump() -> void:
	if velocity.y < -250.0:
		velocity.y *= 0.55

func start_slide() -> void:
	if is_on_floor() and not is_sliding:
		is_sliding = true
		slide_timer = 0.72
		slide_frame_timer = 0.0
		slide_frame = 0
		if collision_shape and collision_shape.shape is CapsuleShape2D:
			(collision_shape.shape as CapsuleShape2D).height = slide_shape_height
			collision_shape.position.y = 22.0

func end_slide() -> void:
	is_sliding = false
	slide_timer = 0.0
	if collision_shape and collision_shape.shape is CapsuleShape2D:
		(collision_shape.shape as CapsuleShape2D).height = base_shape_height
		collision_shape.position.y = 0.0

func _draw() -> void:
	# 1. Ground Drop Shadow
	var shadow_rx = 28.0 if is_sliding else 20.0
	draw_ellipse(Vector2(0, 48), shadow_rx, 6.0, Color(0, 0, 0, 0.45))

	# 2. Skin Distinct Aura
	var aura_color := Color(0, 0, 0, 0)
	match selected_skin:
		"cyberpunk": aura_color = Color("#22D3EE")
		"vip": aura_color = Color("#FACC15")
		"new_year": aura_color = Color("#EF4444")
		"halloween": aura_color = Color("#A855F7")
		"summer": aura_color = Color("#06B6D4")
		"chokha": aura_color = Color("#E2E8F0")
		"svaneti": aura_color = Color("#38BDF8")
		"taxi": aura_color = Color("#F59E0B")

	if aura_color.a > 0.0:
		draw_arc(Vector2(0, 0), 38.0, 0, 2 * PI, 24, Color(aura_color.r, aura_color.g, aura_color.b, 0.35), 3.0)

	# 3. Shield Forcefield
	if has_shield:
		draw_arc(Vector2(0, 0), 44.0, 0, 2 * PI, 28, Color("#38BDF8"), 3.5)
		draw_circle(Vector2(0, 0), 42.0, Color(0.22, 0.74, 0.97, 0.15))

	# 4. Magnet Attraction Ring
	if has_magnet:
		var pulse = sin(Time.get_ticks_msec() * 0.007) * 4.0
		draw_arc(Vector2(0, 0), 68.0 + pulse, 0, 2 * PI, 32, Color(0.22, 0.74, 0.97, 0.4), 2.0)

	# 5. Sliding Somersault Tuck Roll
	if is_sliding:
		var roll_angles = [0.0, 0.12, 0.35, 0.65, 0.45, 0.2]
		var rot = roll_angles[slide_frame % roll_angles.size()] * PI
		
		# Curled somersault ball
		draw_circle(Vector2(0, 22), 22, Color("#18181B"))
		draw_circle(Vector2(6, 16), 11, Color("#FBBF24")) # Tucked head
		draw_circle(Vector2(6, 12), 12, Color("#1C1917")) # Hair

		# Dynamic rotating motion swirl
		var p1 = Vector2(0, 22) + Vector2(cos(rot), sin(rot)) * 18.0
		var p2 = Vector2(0, 22) - Vector2(cos(rot), sin(rot)) * 18.0
		draw_line(p1, p2, Color("#FEF08A"), 3.0)
		return

	# --- 6. STANDING / RUNNING OUTFIT DRAWING PER SKIN ---
	var leg_offset = sin(run_frame_timer) * 14.0 if is_on_floor() else -10.0

	var pants_color := Color("#18181B")
	var shoe_color := Color("#FFFFFF")
	var shoe_accent := Color("#2563EB")
	var torso_color := Color("#18181B")
	var drape_color := Color("#09090B")
	var drape_accent := Color("#FFFFFF")
	var baton_color := Color("#2563EB")
	var is_summer := false

	match selected_skin:
		"new_year":
			pants_color = Color("#1E3A8A")
			shoe_color = Color("#991B1B")
			shoe_accent = Color("#FEF08A")
			torso_color = Color("#DC2626") # red snowflake sweater
			drape_color = Color("#15803D") # green holiday scarf
			drape_accent = Color("#FEF08A")
			baton_color = Color("#EF4444")
		"halloween":
			pants_color = Color("#18181B")
			shoe_color = Color("#7C2D12")
			shoe_accent = Color("#F97316")
			torso_color = Color("#3B0764") # dark purple
			drape_color = Color("#18181B")
			drape_accent = Color("#F97316")
			baton_color = Color("#F97316")
		"summer":
			is_summer = true
			pants_color = Color("#0284C7") # swimming shorts
			shoe_color = Color("#F59E0B") # sandals
			shoe_accent = Color("#0284C7")
			torso_color = Color("#06B6D4") # turquoise Hawaiian shirt
			drape_color = Color("#0891B2")
			drape_accent = Color("#F43F5E")
			baton_color = Color("#FACC15")
		"chokha":
			pants_color = Color("#0F172A")
			shoe_color = Color("#1E293B")
			shoe_accent = Color("#CBD5E1")
			torso_color = Color("#0F172A") # black chokha
			drape_color = Color("#1E293B")
			drape_accent = Color("#CBD5E1")
			baton_color = Color("#E2E8F0")
		"cyberpunk":
			pants_color = Color("#09090B")
			shoe_color = Color("#06B6D4")
			shoe_accent = Color("#EC4899")
			torso_color = Color("#09090B") # techwear
			drape_color = Color("#1E1B4B")
			drape_accent = Color("#22D3EE") # cyan circuits
			baton_color = Color("#22D3EE")
		"taxi":
			pants_color = Color("#334155")
			shoe_color = Color("#78350F")
			shoe_accent = Color("#D97706")
			torso_color = Color("#F8FAFC") # white polo
			drape_color = Color("#78350F") # leather vest
			drape_accent = Color("#B45309")
			baton_color = Color("#F59E0B")
		"svaneti":
			pants_color = Color("#1E293B")
			shoe_color = Color("#475569")
			shoe_accent = Color("#EA580C")
			torso_color = Color("#EA580C") # orange down parka
			drape_color = Color("#1E293B") # Svaneti scarf
			drape_accent = Color("#FFFFFF")
			baton_color = Color("#94A3B8")
		"vip":
			pants_color = Color("#09090B")
			shoe_color = Color("#18181B")
			shoe_accent = Color("#FBBF24")
			torso_color = Color("#09090B") # black tuxedo
			drape_color = Color("#1C1917")
			drape_accent = Color("#FACC15") # 24K gold lapels
			baton_color = Color("#F59E0B")

	# Legs / Pants
	var leg_h = 22.0 if is_summer else 32.0
	draw_rect(Rect2(-14 + leg_offset * 0.4, 12, 10, leg_h), pants_color, true)
	draw_rect(Rect2(4 - leg_offset * 0.4, 12, 10, leg_h), pants_color, true)

	if is_summer:
		# Bare tanned legs between shorts and sandals
		draw_rect(Rect2(-13 + leg_offset * 0.4, 34, 8, 10), Color("#FBBF24"), true)
		draw_rect(Rect2(5 - leg_offset * 0.4, 34, 8, 10), Color("#FBBF24"), true)

	# Shoes
	draw_rect(Rect2(-16 + leg_offset * 0.4, 44, 14, 8), shoe_color, true)
	draw_rect(Rect2(2 - leg_offset * 0.4, 44, 14, 8), shoe_color, true)
	draw_rect(Rect2(-16 + leg_offset * 0.4, 49, 14, 3), shoe_accent, true)
	draw_rect(Rect2(2 - leg_offset * 0.4, 49, 14, 3), shoe_accent, true)

	# Torso Base
	draw_rect(Rect2(-16, -20, 32, 34), torso_color, true)

	# Torso Details per skin
	if selected_skin == "new_year":
		# Knitted snowflakes
		draw_rect(Rect2(-10, -10, 5, 2), Color("#FFFFFF"), true)
		draw_rect(Rect2(-8, -12, 2, 5), Color("#FFFFFF"), true)
		draw_rect(Rect2(5, -10, 5, 2), Color("#FFFFFF"), true)
		draw_rect(Rect2(7, -12, 2, 5), Color("#FFFFFF"), true)
		draw_rect(Rect2(-16, 6, 32, 4), Color("#15803D"), true) # Green belt
	elif selected_skin == "halloween":
		# Pumpkin face
		draw_rect(Rect2(-8, -8, 4, 3), Color("#F97316"), true)
		draw_rect(Rect2(4, -8, 4, 3), Color("#F97316"), true)
		draw_line(Vector2(-6, 4), Vector2(6, 4), Color("#F97316"), 2.0)
	elif selected_skin == "summer":
		# Hawaiian shirt V-neck & floral dots
		draw_colored_polygon(PackedVector2Array([Vector2(-5, -20), Vector2(5, -20), Vector2(0, -10)]), Color("#FFFFFF"))
		draw_circle(Vector2(-6, -2), 3.0, Color("#F43F5E"))
		draw_circle(Vector2(6, 4), 3.0, Color("#F43F5E"))
	elif selected_skin == "chokha":
		# White Akhalukhi V-neck
		draw_colored_polygon(PackedVector2Array([Vector2(-6, -20), Vector2(6, -20), Vector2(0, -6)]), Color("#FFFFFF"))
		# Silver Masrebi (cartridge holders)
		for m in range(4):
			draw_rect(Rect2(-14 + m * 3, -12, 2, 7), Color("#E2E8F0"), true)
			draw_rect(Rect2(4 + m * 3, -12, 2, 7), Color("#E2E8F0"), true)
		draw_rect(Rect2(-16, 6, 32, 4), Color("#94A3B8"), true) # Silver belt
	elif selected_skin == "cyberpunk":
		# Cyan circuits
		draw_line(Vector2(-12, -14), Vector2(-4, -6), Color("#22D3EE"), 2.0)
		draw_line(Vector2(-4, -6), Vector2(-4, 4), Color("#22D3EE"), 2.0)
		draw_line(Vector2(12, -14), Vector2(4, -6), Color("#22D3EE"), 2.0)
		draw_line(Vector2(4, -6), Vector2(4, 4), Color("#22D3EE"), 2.0)
		draw_rect(Rect2(-2, -4, 4, 4), Color("#EC4899"), true)
	elif selected_skin == "taxi":
		# Vintage leather vest
		draw_rect(Rect2(-16, -20, 8, 34), Color("#78350F"), true)
		draw_rect(Rect2(8, -20, 8, 34), Color("#78350F"), true)
	elif selected_skin == "svaneti":
		# Arctic quilted baffles
		draw_line(Vector2(-16, -8), Vector2(16, -8), Color("#9A3412"), 2.0)
		draw_line(Vector2(-16, 2), Vector2(16, 2), Color("#9A3412"), 2.0)
		draw_rect(Rect2(-3, -4, 6, 2), Color("#FFFFFF"), true)
		draw_rect(Rect2(-1, -6, 2, 6), Color("#FFFFFF"), true)
	elif selected_skin == "vip":
		# 24K Gold Lapels
		draw_colored_polygon(PackedVector2Array([Vector2(-13, -20), Vector2(-3, -2), Vector2(-8, 8)]), Color("#FACC15"))
		draw_colored_polygon(PackedVector2Array([Vector2(13, -20), Vector2(3, -2), Vector2(8, 8)]), Color("#FACC15"))

	# Draped shoulder sweater / scarf sleeves
	draw_rect(Rect2(-18, -18, 6, 28), drape_color, true)
	draw_rect(Rect2(12, -18, 6, 28), drape_color, true)
	draw_line(Vector2(-15, -16), Vector2(-15, 8), drape_accent, 1.5)
	draw_line(Vector2(15, -16), Vector2(15, 8), drape_accent, 1.5)

	# --- 7. HEAD & FACE: 100% UNTOUCHED AUTHENTIC KOTE ("სახე არ შეცვალო"!) ---
	# Neck
	draw_rect(Rect2(-5, -24, 10, 6), Color("#D97706"), true)

	# Face
	draw_rect(Rect2(-13, -50, 26, 28), Color("#FBBF24"), true)

	# Eyes
	draw_rect(Rect2(-9, -40, 4, 3), Color("#451A03"), true)
	draw_rect(Rect2(5, -40, 4, 3), Color("#451A03"), true)

	# Determined Smile
	draw_arc(Vector2(0, -31), 5.0, 0.1 * PI, 0.9 * PI, 10, Color("#78350F"), 1.5)

	# Dark Hair & Bangs
	draw_rect(Rect2(-15, -58, 30, 14), Color("#1C1917"), true)
	var bangs_pts = PackedVector2Array([
		Vector2(-15, -47), Vector2(-3, -42), Vector2(5, -47),
		Vector2(13, -44), Vector2(15, -50), Vector2(-15, -50)
	])
	draw_colored_polygon(bangs_pts, Color("#1C1917"))

	# Item in hand
	draw_rect(Rect2(12, 0, 14, 6), baton_color, true)

func draw_ellipse(center: Vector2, rx: float, ry: float, color: Color) -> void:
	var points = PackedVector2Array()
	var segments = 16
	for i in range(segments):
		var theta = i * (2 * PI / segments)
		points.append(center + Vector2(cos(theta) * rx, sin(theta) * ry))
	draw_colored_polygon(points, color)
